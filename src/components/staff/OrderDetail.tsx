import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Permission } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { formatPrice } from '@/lib/money';
import { formatPhone } from '@/lib/validation';
import { deliveryLabel } from '@/lib/delivery';
import {
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  nextStatuses,
  statusTone,
} from '@/lib/orders';
import { StaffCard } from '@/components/staff/StaffShell';
import { StatusControl } from '@/components/staff/StatusControl';
import { getCurrentUser, hasPermission } from '@/lib/auth';
import { cn } from '@/lib/utils';

export async function OrderDetail({ root, id }: { root: string; id: string }) {
  const [order, user] = await Promise.all([
    prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
        pickupPoint: true,
        zone: true,
        user: { select: { id: true, name: true, phone: true } },
        events: { orderBy: { createdAt: 'desc' }, include: { by: { select: { name: true } } } },
      },
    }),
    getCurrentUser(),
  ]);

  if (!order) notFound();

  const canManage = hasPermission(user, Permission.ORDERS_MANAGE);
  const transitions = nextStatuses(order.status, order.deliveryMethod);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href={`${root}/orders`}
            className="inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink"
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            Все заказы
          </Link>
          <h1 className="price-figures mt-2 text-xl font-semibold text-ink">{order.number}</h1>
          <p className="text-xs text-ink-faint">
            {order.createdAt.toLocaleString('ru-RU', { dateStyle: 'long', timeStyle: 'short' })}
          </p>
        </div>

        <span className={cn('rounded-full px-3 py-1 text-sm font-medium', statusTone(order.status))}>
          {ORDER_STATUS_LABELS[order.status]}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <StaffCard>
            <h2 className="px-5 py-4 text-sm font-semibold text-ink">Состав заказа</h2>
            <ul className="divide-y divide-line border-t border-line">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-baseline justify-between gap-4 px-5 py-3">
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-ink">{item.name}</span>
                    <span className="block text-xs text-ink-muted">
                      {item.colorName}
                      {item.size !== 'ONE' ? ` · ${item.size}` : ''} · {item.quantity} шт.
                    </span>
                  </span>
                  <span className="price-figures shrink-0 text-sm text-ink">
                    {formatPrice(item.price * item.quantity)}
                  </span>
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
          </StaffCard>

          <StaffCard>
            <h2 className="px-5 py-4 text-sm font-semibold text-ink">История статусов</h2>
            <ol className="divide-y divide-line border-t border-line">
              {order.events.map((event) => (
                <li key={event.id} className="flex items-baseline justify-between gap-4 px-5 py-3">
                  <span>
                    <span className="text-sm text-ink">{ORDER_STATUS_LABELS[event.status]}</span>
                    {event.note ? (
                      <span className="block text-xs text-ink-muted">{event.note}</span>
                    ) : null}
                    {event.by ? (
                      <span className="block text-xs text-ink-faint">{event.by.name}</span>
                    ) : null}
                  </span>
                  <span className="price-figures shrink-0 text-xs text-ink-faint">
                    {event.createdAt.toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                </li>
              ))}
            </ol>
          </StaffCard>
        </div>

        <div className="space-y-6">
          <StaffCard className="px-5 py-4">
            <h2 className="text-sm font-semibold text-ink">Покупатель</h2>
            <p className="mt-2 text-sm text-ink">{order.customerName}</p>
            <a
              href={`tel:${order.customerPhone}`}
              className="price-figures block text-sm text-brand hover:text-brand-hover"
            >
              {formatPhone(order.customerPhone)}
            </a>
            {order.user ? (
              <p className="mt-1 text-xs text-ink-faint">Зарегистрированный клиент</p>
            ) : (
              <p className="mt-1 text-xs text-ink-faint">Заказ без регистрации</p>
            )}
            {order.comment ? (
              <p className="mt-3 rounded-lg bg-surface-alt px-3 py-2 text-xs text-ink-muted">
                {order.comment}
              </p>
            ) : null}
          </StaffCard>

          <StaffCard className="px-5 py-4">
            <h2 className="text-sm font-semibold text-ink">Доставка и оплата</h2>
            <dl className="mt-2 space-y-1.5 text-sm">
              <Row label="Способ" value={deliveryLabel(order.deliveryMethod)} />
              {order.pickupPoint ? <Row label="Магазин" value={order.pickupPoint.name} /> : null}
              {order.city ? <Row label="Город" value={order.city} /> : null}
              {order.address ? <Row label="Адрес" value={order.address} /> : null}
              <Row label="Оплата" value={PAYMENT_METHOD_LABELS[order.paymentMethod]} />
              <Row label="Статус оплаты" value={PAYMENT_STATUS_LABELS[order.paymentStatus]} />
            </dl>
          </StaffCard>

          {canManage && transitions.length > 0 ? (
            <StaffCard className="px-5 py-4">
              <h2 className="text-sm font-semibold text-ink">Изменить статус</h2>
              <StatusControl orderId={order.id} options={transitions} />
            </StaffCard>
          ) : null}

          {transitions.length === 0 ? (
            <p className="text-xs text-ink-faint">
              Заказ завершён — статус больше не меняется.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="shrink-0 text-ink-faint">{label}</dt>
      <dd className="text-right text-ink">{value}</dd>
    </div>
  );
}
