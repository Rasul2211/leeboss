import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ArrowLeft, Check } from 'lucide-react';
import { DeliveryMethod, OrderStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { formatPrice } from '@/lib/money';
import { deliveryLabel } from '@/lib/delivery';
import { ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS } from '@/lib/orders';
import { ReviewForm } from '@/components/account/ReviewForm';
import { cn } from '@/lib/utils';

/** The path an order walks, so the customer can see where theirs stands. */
function journey(method: DeliveryMethod): OrderStatus[] {
  return [
    OrderStatus.NEW,
    OrderStatus.CONFIRMED,
    OrderStatus.PACKING,
    method === DeliveryMethod.PICKUP ? OrderStatus.READY_FOR_PICKUP : OrderStatus.IN_DELIVERY,
    OrderStatus.COMPLETED,
  ];
}

export default async function AccountOrderPage({
  params,
}: {
  params: Promise<{ number: string }>;
}) {
  const [{ number }, user] = await Promise.all([params, requireUser('/account/orders')]);

  const order = await prisma.order.findFirst({
    // scoped to the signed-in user: knowing a number must not reveal a stranger's order
    where: { number: decodeURIComponent(number), userId: user.id },
    include: {
      items: {
        include: {
          product: {
            select: {
              slug: true,
              images: { select: { url: true }, take: 1, orderBy: { sortOrder: 'asc' } },
            },
          },
        },
      },
      pickupPoint: true,
      zone: true,
      events: { orderBy: { createdAt: 'asc' } },
      reviews: { select: { productId: true } },
    },
  });
  if (!order) notFound();

  const reached = new Set(order.events.map((event) => event.status));
  const steps = journey(order.deliveryMethod);
  const cancelled = order.status === OrderStatus.CANCELLED;
  const reviewed = new Set(order.reviews.map((review) => review.productId));

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/account/orders"
          className="inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          Все заказы
        </Link>
        <h2 className="price-figures mt-2 text-xl font-semibold text-ink">{order.number}</h2>
        <p className="price-figures text-xs text-ink-faint">
          {order.createdAt.toLocaleString('ru-RU', { dateStyle: 'long', timeStyle: 'short' })}
        </p>
      </div>

      {cancelled ? (
        <p className="rounded-card bg-surface-alt px-5 py-4 text-sm text-ink-muted">
          Заказ отменён. Товары возвращены в наличие — их можно заказать снова.
        </p>
      ) : (
        <ol className="flex flex-wrap gap-x-2 gap-y-3 rounded-card border border-line px-5 py-4">
          {steps.map((step) => {
            const done = reached.has(step);
            const current = order.status === step;
            return (
              <li key={step} className="flex items-center gap-2">
                <span
                  className={cn(
                    'grid size-5 place-items-center rounded-full text-[10px]',
                    done ? 'bg-brand text-white' : 'border border-line text-ink-faint',
                  )}
                >
                  {done ? <Check className="size-3" aria-hidden /> : null}
                </span>
                <span
                  className={cn(
                    'text-xs',
                    current ? 'font-semibold text-ink' : done ? 'text-ink-muted' : 'text-ink-faint',
                  )}
                >
                  {ORDER_STATUS_LABELS[step]}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      <div className="rounded-card border border-line">
        <ul className="divide-y divide-line">
          {order.items.map((item) => (
            <li key={item.id} className="flex gap-4 px-5 py-4">
              <Link
                href={`/product/${item.product.slug}`}
                className="relative size-16 shrink-0 overflow-hidden rounded-md bg-surface-alt"
              >
                {item.product.images[0] ? (
                  <Image
                    src={item.product.images[0].url}
                    alt={item.name}
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                ) : null}
              </Link>

              <div className="min-w-0 flex-1">
                <Link
                  href={`/product/${item.product.slug}`}
                  className="block truncate text-sm text-ink hover:text-brand"
                >
                  {item.name}
                </Link>
                <p className="text-xs text-ink-muted">
                  {item.colorName}
                  {item.size !== 'ONE' ? ` · ${item.size}` : ''} · {item.quantity} шт.
                </p>

                {order.status === OrderStatus.COMPLETED ? (
                  reviewed.has(item.productId) ? (
                    <p className="mt-2 text-xs text-ink-faint">
                      Отзыв отправлен, он появится после модерации
                    </p>
                  ) : (
                    <ReviewForm
                      orderId={order.id}
                      productId={item.productId}
                      productName={item.name}
                    />
                  )
                ) : null}
              </div>

              <p className="price-figures shrink-0 text-sm text-ink">
                {formatPrice(item.price * item.quantity)}
              </p>
            </li>
          ))}
        </ul>

        <dl className="space-y-1.5 border-t border-line px-5 py-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-muted">Товары</dt>
            <dd className="price-figures text-ink">{formatPrice(order.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-muted">{deliveryLabel(order.deliveryMethod)}</dt>
            <dd className="price-figures text-ink">
              {order.deliveryCost === 0 ? 'бесплатно' : formatPrice(order.deliveryCost)}
            </dd>
          </div>
          <div className="flex justify-between border-t border-line pt-1.5">
            <dt className="font-medium text-ink">Итого</dt>
            <dd className="price-figures font-semibold text-brand">{formatPrice(order.total)}</dd>
          </div>
        </dl>
      </div>

      <div className="rounded-card bg-surface-alt px-5 py-4 text-sm">
        <dl className="space-y-1.5">
          {order.pickupPoint ? (
            <Row label="Забрать" value={`${order.pickupPoint.name}, ${order.pickupPoint.address}`} />
          ) : (
            <Row label="Адрес" value={`${order.city ?? ''}, ${order.address ?? ''}`} />
          )}
          {order.zone ? (
            <Row label="Срок" value={`${order.zone.daysMin}–${order.zone.daysMax} дней`} />
          ) : null}
          <Row label="Оплата" value={PAYMENT_METHOD_LABELS[order.paymentMethod]} />
          <Row label="Статус оплаты" value={PAYMENT_STATUS_LABELS[order.paymentStatus]} />
          {order.comment ? <Row label="Комментарий" value={order.comment} /> : null}
        </dl>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="shrink-0 text-ink-faint">{label}</dt>
      <dd className="text-right text-ink">{value}</dd>
    </div>
  );
}
