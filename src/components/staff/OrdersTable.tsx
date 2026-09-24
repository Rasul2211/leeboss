import Link from 'next/link';
import { OrderStatus, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { formatPrice } from '@/lib/money';
import { formatPhone } from '@/lib/validation';
import { ORDER_STATUS_LABELS, statusTone } from '@/lib/orders';
import { deliveryLabel } from '@/lib/delivery';
import { StaffCard } from '@/components/staff/StaffShell';
import { cn } from '@/lib/utils';

const PER_PAGE = 20;

function isStatus(value: string | undefined): value is OrderStatus {
  return value != null && value in OrderStatus;
}

export async function OrdersTable({
  root,
  status,
  page = 1,
}: {
  root: string;
  status?: string;
  page?: number;
}) {
  const where: Prisma.OrderWhereInput = isStatus(status) ? { status } : {};

  const [orders, total, counts] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: {
        id: true,
        number: true,
        status: true,
        total: true,
        customerName: true,
        customerPhone: true,
        deliveryMethod: true,
        createdAt: true,
        _count: { select: { items: true } },
      },
    }),
    prisma.order.count({ where }),
    prisma.order.groupBy({ by: ['status'], _count: { _all: true } }),
  ]);

  const countFor = (value: OrderStatus) =>
    counts.find((row) => row.status === value)?._count._all ?? 0;

  const pages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <div className="space-y-4">
      <div className="hide-scrollbar flex gap-1.5 overflow-x-auto pb-1">
        <FilterChip href={`${root}/orders`} active={!isStatus(status)}>
          Все <Count value={counts.reduce((sum, row) => sum + row._count._all, 0)} active={!isStatus(status)} />
        </FilterChip>
        {(Object.keys(ORDER_STATUS_LABELS) as OrderStatus[]).map((value) => (
          <FilterChip key={value} href={`${root}/orders?status=${value}`} active={status === value}>
            {ORDER_STATUS_LABELS[value]} <Count value={countFor(value)} active={status === value} />
          </FilterChip>
        ))}
      </div>

      <StaffCard>
        {orders.length === 0 ? (
          <p className="px-5 py-14 text-center text-sm text-ink-faint">Заказов здесь нет</p>
        ) : (
          <ul className="divide-y divide-line">
            {orders.map((order) => (
              <li key={order.id}>
                <Link
                  href={`${root}/orders/${order.id}`}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-5 py-3.5 hover:bg-surface-alt"
                >
                  <span className="price-figures w-24 shrink-0 text-sm font-medium text-ink">
                    {order.number}
                  </span>

                  <span
                    className={cn(
                      'shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium',
                      statusTone(order.status),
                    )}
                  >
                    {ORDER_STATUS_LABELS[order.status]}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-ink">{order.customerName}</span>
                    <span className="price-figures block text-xs text-ink-faint">
                      {formatPhone(order.customerPhone)}
                    </span>
                  </span>

                  <span className="hidden shrink-0 text-xs text-ink-muted sm:block">
                    {deliveryLabel(order.deliveryMethod)} · {order._count.items} поз.
                  </span>

                  <span className="price-figures shrink-0 text-sm font-medium text-ink">
                    {formatPrice(order.total)}
                  </span>

                  <span className="price-figures w-24 shrink-0 text-right text-xs text-ink-faint">
                    {order.createdAt.toLocaleDateString('ru-RU')}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </StaffCard>

      {pages > 1 ? (
        <nav className="flex justify-center gap-1" aria-label="Страницы заказов">
          {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
            <Link
              key={n}
              href={`${root}/orders?${new URLSearchParams({
                ...(isStatus(status) ? { status } : {}),
                ...(n > 1 ? { page: String(n) } : {}),
              })}`}
              aria-current={n === page ? 'page' : undefined}
              className={cn(
                'price-figures grid h-9 min-w-9 place-items-center rounded-lg px-2 text-sm',
                n === page ? 'bg-brand text-white' : 'text-ink-muted hover:bg-white',
              )}
            >
              {n}
            </Link>
          ))}
        </nav>
      ) : null}
    </div>
  );
}

function FilterChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-xs transition-colors',
        active ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink-muted hover:border-ink/30',
      )}
    >
      {children}
    </Link>
  );
}

function Count({ value, active }: { value: number; active: boolean }) {
  return (
    <span className={cn('price-figures', active ? 'text-white/60' : 'text-ink-faint')}>{value}</span>
  );
}
