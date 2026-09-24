import Link from 'next/link';
import { ArrowRight, Heart, MapPin, Package, Shirt } from 'lucide-react';
import { OrderStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { formatPrice } from '@/lib/money';
import { ORDER_STATUS_LABELS, statusTone } from '@/lib/orders';
import { cn } from '@/lib/utils';

export default async function AccountPage() {
  const user = await requireUser('/account');

  const [orders, favorites, looks, addresses, lastOrders] = await Promise.all([
    prisma.order.count({ where: { userId: user.id } }),
    prisma.favorite.count({ where: { userId: user.id } }),
    prisma.look.count({ where: { userId: user.id } }),
    prisma.address.count({ where: { userId: user.id } }),
    prisma.order.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: { id: true, number: true, status: true, total: true, createdAt: true },
    }),
  ]);

  return (
    <div className="space-y-8">
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile href="/account/orders" icon={Package} label="Заказы" value={orders} />
        <Tile href="/account/favorites" icon={Heart} label="Избранное" value={favorites} />
        <Tile href="/account/looks" icon={Shirt} label="Образы" value={looks} />
        <Tile href="/account/addresses" icon={MapPin} label="Адреса" value={addresses} />
      </ul>

      <section>
        <div className="flex items-baseline justify-between">
          <h2 className="text-base font-semibold text-ink">Последние заказы</h2>
          {orders > 0 ? (
            <Link
              href="/account/orders"
              className="inline-flex items-center gap-1 text-sm text-brand hover:text-brand-hover"
            >
              Все заказы
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          ) : null}
        </div>

        {lastOrders.length === 0 ? (
          <div className="mt-4 rounded-card border border-dashed border-line px-5 py-12 text-center">
            <p className="text-sm text-ink-muted">Вы ещё ничего не заказывали.</p>
            <Link
              href="/catalog"
              className="mt-3 inline-block text-sm font-medium text-brand hover:text-brand-hover"
            >
              Открыть каталог
            </Link>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-line rounded-card border border-line">
            {lastOrders.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/account/orders/${order.number}`}
                  className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-surface-alt"
                >
                  <span>
                    <span className="price-figures block text-sm font-medium text-ink">
                      {order.number}
                    </span>
                    <span className="price-figures block text-xs text-ink-faint">
                      {order.createdAt.toLocaleDateString('ru-RU')}
                    </span>
                  </span>

                  <span className="flex items-center gap-3">
                    <span
                      className={cn(
                        'rounded-full px-2.5 py-0.5 text-xs font-medium',
                        statusTone(order.status as OrderStatus),
                      )}
                    >
                      {ORDER_STATUS_LABELS[order.status]}
                    </span>
                    <span className="price-figures text-sm text-ink">{formatPrice(order.total)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Tile({
  href,
  icon: Icon,
  label,
  value,
}: {
  href: string;
  icon: typeof Package;
  label: string;
  value: number;
}) {
  return (
    <li>
      <Link
        href={href}
        className="block rounded-card border border-line px-4 py-4 transition-colors hover:border-ink/25"
      >
        <Icon className="size-4 text-ink-faint" aria-hidden />
        <p className="price-figures mt-2 text-xl font-semibold text-ink">{value}</p>
        <p className="text-xs text-ink-muted">{label}</p>
      </Link>
    </li>
  );
}
