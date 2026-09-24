import Link from 'next/link';
import { OrderStatus, Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { formatPrice } from '@/lib/money';
import { StaffCard } from '@/components/staff/StaffShell';
import { ORDER_STATUS_LABELS } from '@/lib/orders';

/** Statuses that mean the shop actually earned the money. */
const EARNED: OrderStatus[] = [OrderStatus.COMPLETED];
const OPEN: OrderStatus[] = [
  OrderStatus.NEW,
  OrderStatus.CONFIRMED,
  OrderStatus.PACKING,
  OrderStatus.READY_FOR_PICKUP,
  OrderStatus.IN_DELIVERY,
];

const LOW_STOCK = 2;

export async function Dashboard({ root }: { root: string }) {
  const [revenue, openCount, completedCount, customers, products, lowStock, recent, topSellers] =
    await Promise.all([
      prisma.order.aggregate({ where: { status: { in: EARNED } }, _sum: { total: true } }),
      prisma.order.count({ where: { status: { in: OPEN } } }),
      prisma.order.count({ where: { status: { in: EARNED } } }),
      prisma.user.count({ where: { role: Role.CUSTOMER } }),
      prisma.product.count({ where: { isActive: true } }),
      prisma.productVariant.findMany({
        where: { stock: { lte: LOW_STOCK }, product: { isActive: true } },
        orderBy: { stock: 'asc' },
        take: 8,
        select: {
          id: true,
          size: true,
          stock: true,
          color: { select: { name: true } },
          product: { select: { name: true, slug: true } },
        },
      }),
      prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: {
          id: true,
          number: true,
          status: true,
          total: true,
          customerName: true,
          createdAt: true,
        },
      }),
      prisma.orderItem.groupBy({
        by: ['productId'],
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      }),
    ]);

  const sellerNames = topSellers.length
    ? await prisma.product.findMany({
        where: { id: { in: topSellers.map((t) => t.productId) } },
        select: { id: true, name: true },
      })
    : [];
  const nameById = new Map(sellerNames.map((p) => [p.id, p.name]));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Выручка" value={formatPrice(revenue._sum.total ?? 0)} note="по выполненным заказам" />
        <Stat label="Заказов в работе" value={String(openCount)} note="ждут обработки" />
        <Stat label="Выполнено заказов" value={String(completedCount)} />
        <Stat label="Клиентов" value={String(customers)} note={`${products} товаров в каталоге`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <StaffCard>
          <div className="flex items-center justify-between px-5 py-4">
            <h2 className="text-sm font-semibold text-ink">Последние заказы</h2>
            <Link href={`${root}/orders`} className="text-xs text-brand hover:text-brand-hover">
              Все заказы
            </Link>
          </div>

          {recent.length === 0 ? (
            <Empty>Заказов пока нет</Empty>
          ) : (
            <ul className="divide-y divide-line border-t border-line">
              {recent.map((order) => (
                <li key={order.id}>
                  <Link
                    href={`${root}/orders/${order.id}`}
                    className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-surface-alt"
                  >
                    <span className="min-w-0">
                      <span className="price-figures block text-sm font-medium text-ink">
                        {order.number}
                      </span>
                      <span className="block truncate text-xs text-ink-muted">
                        {order.customerName} · {ORDER_STATUS_LABELS[order.status]}
                      </span>
                    </span>
                    <span className="price-figures shrink-0 text-sm text-ink">
                      {formatPrice(order.total)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </StaffCard>

        <StaffCard>
          <div className="flex items-center justify-between px-5 py-4">
            <h2 className="text-sm font-semibold text-ink">Заканчиваются</h2>
            <Link href={`${root}/stock`} className="text-xs text-brand hover:text-brand-hover">
              Остатки
            </Link>
          </div>

          {lowStock.length === 0 ? (
            <Empty>Всё в достатке</Empty>
          ) : (
            <ul className="divide-y divide-line border-t border-line">
              {lowStock.map((variant) => (
                <li key={variant.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-ink">{variant.product.name}</span>
                    <span className="block text-xs text-ink-muted">
                      {variant.color.name}
                      {variant.size !== 'ONE' ? ` · ${variant.size}` : ''}
                    </span>
                  </span>
                  <span
                    className={`price-figures shrink-0 text-sm font-semibold ${
                      variant.stock === 0 ? 'text-brand' : 'text-ink'
                    }`}
                  >
                    {variant.stock} шт.
                  </span>
                </li>
              ))}
            </ul>
          )}
        </StaffCard>
      </div>

      <StaffCard>
        <h2 className="px-5 py-4 text-sm font-semibold text-ink">Чаще всего покупают</h2>
        {topSellers.length === 0 ? (
          // counted from real order lines, so it stays empty until sales happen
          <Empty>Появится, когда пройдут первые продажи</Empty>
        ) : (
          <ul className="divide-y divide-line border-t border-line">
            {topSellers.map((row) => (
              <li key={row.productId} className="flex items-center justify-between gap-3 px-5 py-3">
                <span className="truncate text-sm text-ink">{nameById.get(row.productId) ?? '—'}</span>
                <span className="price-figures shrink-0 text-sm text-ink-muted">
                  {row._sum.quantity} шт.
                </span>
              </li>
            ))}
          </ul>
        )}
      </StaffCard>
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <StaffCard className="px-5 py-4">
      <p className="text-xs text-ink-faint">{label}</p>
      <p className="price-figures mt-1 text-xl font-semibold text-ink">{value}</p>
      {note ? <p className="mt-0.5 text-xs text-ink-faint">{note}</p> : null}
    </StaffCard>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="border-t border-line px-5 py-8 text-center text-sm text-ink-faint">{children}</p>
  );
}
