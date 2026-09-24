import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CheckCircle2, Clock, MapPin } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { formatPrice } from '@/lib/money';
import { formatPhone } from '@/lib/validation';
import { deliveryLabel } from '@/lib/delivery';
import { Button } from '@/components/ui/button';

type Props = { params: Promise<{ number: string }> };

export const metadata: Metadata = { title: 'Заказ оформлен', robots: { index: false } };

export default async function OrderPage({ params }: Props) {
  const { number } = await params;

  const order = await prisma.order.findUnique({
    where: { number: decodeURIComponent(number) },
    include: {
      items: true,
      pickupPoint: true,
      zone: true,
    },
  });
  if (!order) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-14">
      <div className="text-center">
        <CheckCircle2 className="mx-auto size-12 text-brand" aria-hidden />
        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-ink">Заказ оформлен</h1>
        <p className="price-figures mt-1 text-sm text-ink-muted">Номер {order.number}</p>
      </div>

      <div className="mt-8 rounded-card border border-line">
        <ul className="divide-y divide-line">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-baseline justify-between gap-4 px-5 py-3.5">
              <span className="text-sm text-ink">
                {item.name}
                <span className="text-ink-faint">
                  {' · '}
                  {item.colorName}
                  {item.size !== 'ONE' ? ` · ${item.size}` : ''}
                  {item.quantity > 1 ? ` · ${item.quantity} шт.` : ''}
                </span>
              </span>
              <span className="price-figures shrink-0 text-sm text-ink">
                {formatPrice(item.price * item.quantity)}
              </span>
            </li>
          ))}
        </ul>

        <dl className="space-y-2 border-t border-line px-5 py-4 text-sm">
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
          <div className="flex justify-between border-t border-line pt-2">
            <dt className="font-medium text-ink">Итого</dt>
            <dd className="price-figures text-lg font-semibold text-brand">
              {formatPrice(order.total)}
            </dd>
          </div>
        </dl>
      </div>

      <div className="mt-6 space-y-3 rounded-card bg-surface-alt px-5 py-4 text-sm">
        {order.pickupPoint ? (
          <p className="flex items-start gap-2.5 text-ink-muted">
            <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>
              <span className="font-medium text-ink">{order.pickupPoint.name}</span>
              {' — '}
              {order.pickupPoint.address}
              <span className="block text-ink-faint">
                Работаем {order.pickupPoint.hoursFrom}–{order.pickupPoint.hoursTo}
              </span>
            </span>
          </p>
        ) : (
          <p className="flex items-start gap-2.5 text-ink-muted">
            <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>
              {order.city}, {order.address}
              {order.zone ? (
                <span className="block text-ink-faint">
                  Срок {order.zone.daysMin}–{order.zone.daysMax} дней
                </span>
              ) : null}
            </span>
          </p>
        )}

        <p className="flex items-start gap-2.5 text-ink-muted">
          <Clock className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            Мы позвоним на {formatPhone(order.customerPhone)}, чтобы подтвердить заказ.
          </span>
        </p>
      </div>

      {order.paymentMethod === 'CARD_DEMO' ? (
        <p className="mt-4 rounded-lg border border-line px-4 py-3 text-xs leading-relaxed text-ink-muted">
          Оплата прошла в демонстрационном режиме: заказ помечен оплаченным в системе, но реальных
          денег не списывалось.
        </p>
      ) : null}

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link href="/catalog">Продолжить покупки</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/account/orders">Мои заказы</Link>
        </Button>
      </div>
    </div>
  );
}
