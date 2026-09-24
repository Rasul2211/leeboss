import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { DeliveryPanel } from '@/components/staff/DeliveryPanel';
import { StaffHeader } from '@/components/staff/StaffShell';

export default async function DeliveryPage() {
  await requireAdmin();

  const [zones, points] = await Promise.all([
    prisma.deliveryZone.findMany({ orderBy: { cost: 'asc' } }),
    prisma.pickupPoint.findMany({ orderBy: { name: 'asc' } }),
  ]);

  return (
    <>
      <StaffHeader
        title="Доставка"
        description="Зоны, цены и сроки. Применяются при оформлении заказа."
      />
      <DeliveryPanel zones={zones} points={points} />
    </>
  );
}
