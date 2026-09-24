import { Permission, Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth';
import { StaffCard, StaffHeader } from '@/components/staff/StaffShell';
import { formatPhone } from '@/lib/validation';
import { formatPrice } from '@/lib/money';

export default async function CustomersPage() {
  await requirePermission(Permission.CUSTOMERS_VIEW);

  const customers = await prisma.user.findMany({
    where: { role: Role.CUSTOMER },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      phone: true,
      orders: { select: { total: true, status: true } },
    },
  });

  return (
    <>
      <StaffHeader title="Клиенты" description="Зарегистрированные покупатели и их заказы." />

      <StaffCard>
        {customers.length === 0 ? (
          <p className="px-5 py-14 text-center text-sm text-ink-faint">Клиентов пока нет</p>
        ) : (
          <ul className="divide-y divide-line">
            {customers.map((customer) => {
              // only completed orders count as money the shop actually took
              const spent = customer.orders
                .filter((order) => order.status === 'COMPLETED')
                .reduce((sum, order) => sum + order.total, 0);

              return (
                <li key={customer.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-ink">{customer.name}</span>
                    <span className="price-figures block text-xs text-ink-faint">
                      {formatPhone(customer.phone)}
                    </span>
                  </span>
                  <span className="price-figures shrink-0 text-xs text-ink-muted">
                    {customer.orders.length} заказов
                  </span>
                  <span className="price-figures w-28 shrink-0 text-right text-sm text-ink">
                    {formatPrice(spent)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </StaffCard>
    </>
  );
}
