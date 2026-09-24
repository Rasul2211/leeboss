import { Permission } from '@prisma/client';
import { requirePermission } from '@/lib/auth';
import { OrderDetail } from '@/components/staff/OrderDetail';

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission(Permission.ORDERS_VIEW);
  const { id } = await params;
  return <OrderDetail root="/admin" id={id} />;
}
