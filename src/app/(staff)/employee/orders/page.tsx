import { Permission } from '@prisma/client';
import { requirePermission } from '@/lib/auth';
import { OrdersTable } from '@/components/staff/OrdersTable';
import { StaffHeader } from '@/components/staff/StaffShell';

type Search = { status?: string; page?: string };

export default async function OrdersPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requirePermission(Permission.ORDERS_VIEW);
  const { status, page } = await searchParams;

  return (
    <>
      <StaffHeader title="Заказы" description="Новые заказы приходят сюда сразу после оформления." />
      <OrdersTable root="/employee" status={status} page={Math.max(1, Number(page) || 1)} />
    </>
  );
}
