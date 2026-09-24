import Link from 'next/link';
import Image from 'next/image';
import { Package } from 'lucide-react';
import { OrderStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { formatPrice } from '@/lib/money';
import { ORDER_STATUS_LABELS, statusTone } from '@/lib/orders';
import { deliveryLabel } from '@/lib/delivery';
import { cn } from '@/lib/utils';

export default async function AccountOrdersPage() {
  const user = await requireUser('/account/orders');

  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      number: true,
      status: true,
      total: true,
      deliveryMethod: true,
      createdAt: true,
      items: {
        select: {
          id: true,
          name: true,
          quantity: true,
          product: { select: { images: { select: { url: true }, take: 1, orderBy: { sortOrder: 'asc' } } } },
        },
      },
    },
  });

  if (orders.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-line px-5 py-16 text-center">
        <Package className="mx-auto size-8 text-ink-faint" aria-hidden />
        <p className="mt-4 text-sm font-medium text-ink">Заказов пока нет</p>
        <p className="mt-1 text-sm text-ink-muted">
          Оформленные заказы появятся здесь вместе со статусом доставки.
        </p>
        <Link
          href="/catalog"
          className="mt-5 inline-block text-sm font-medium text-brand hover:text-brand-hover"
        >
          В каталог
        </Link>
      </div>
    );
  }

  return (
    <ul className="space-y-4">
      {orders.map((order) => (
        <li key={order.id} className="rounded-card border border-line">
          <Link href={`/account/orders/${order.number}`} className="block hover:bg-surface-alt">
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div>
                <p className="price-figures text-sm font-medium text-ink">{order.number}</p>
                <p className="price-figures text-xs text-ink-faint">
                  {order.createdAt.toLocaleDateString('ru-RU', { dateStyle: 'long' })} ·{' '}
                  {deliveryLabel(order.deliveryMethod)}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    'rounded-full px-2.5 py-0.5 text-xs font-medium',
                    statusTone(order.status as OrderStatus),
                  )}
                >
                  {ORDER_STATUS_LABELS[order.status]}
                </span>
                <span className="price-figures text-sm font-semibold text-ink">
                  {formatPrice(order.total)}
                </span>
              </div>
            </div>

            <ul className="flex gap-2 px-5 pb-4">
              {order.items.slice(0, 5).map((item) => (
                <li
                  key={item.id}
                  className="relative size-14 overflow-hidden rounded-md bg-surface-alt"
                  title={item.name}
                >
                  {item.product.images[0] ? (
                    <Image
                      src={item.product.images[0].url}
                      alt={item.name}
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  ) : null}
                </li>
              ))}
              {order.items.length > 5 ? (
                <li className="price-figures grid size-14 place-items-center rounded-md bg-surface-alt text-xs text-ink-muted">
                  +{order.items.length - 5}
                </li>
              ) : null}
            </ul>
          </Link>
        </li>
      ))}
    </ul>
  );
}
