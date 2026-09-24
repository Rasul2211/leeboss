import { Permission } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth';
import { StockTable } from '@/components/staff/StockTable';
import { StaffHeader } from '@/components/staff/StaffShell';

export default async function StockPage() {
  await requirePermission(Permission.STOCK_MANAGE);

  const variants = await prisma.productVariant.findMany({
    where: { product: { isActive: true } },
    orderBy: [{ stock: 'asc' }, { productId: 'asc' }],
    select: {
      id: true,
      size: true,
      stock: true,
      color: { select: { name: true } },
      product: { select: { id: true, name: true, brand: true } },
    },
  });

  return (
    <>
      <StaffHeader title="Остатки" description="Количество по каждому цвету и размеру." />
      <StockTable
        root="/employee"
        rows={variants.map((v) => ({
          id: v.id,
          size: v.size,
          stock: v.stock,
          colorName: v.color.name,
          productId: v.product.id,
          productName: v.product.name,
          brand: v.product.brand,
        }))}
      />
    </>
  );
}
