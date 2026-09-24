import { Permission } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth';
import { LooksPanel } from '@/components/staff/LooksPanel';
import { StaffHeader } from '@/components/staff/StaffShell';

export default async function LooksPage() {
  await requirePermission(Permission.LOOKS_MANAGE);

  const looks = await prisma.look.findMany({
    orderBy: [{ isPublic: 'desc' }, { sortOrder: 'asc' }],
    select: {
      id: true,
      name: true,
      isPublic: true,
      user: { select: { name: true } },
      items: {
        select: {
          product: {
            select: {
              id: true,
              name: true,
              price: true,
              salePrice: true,
              images: { select: { url: true }, take: 1, orderBy: { sortOrder: 'asc' } },
            },
          },
        },
      },
    },
  });

  return (
    <>
      <StaffHeader
        title="Образы"
        description="Готовые образы для главной и примерочной, плюс то, что собрали клиенты."
      />
      <LooksPanel
        looks={looks.map((look) => ({
          id: look.id,
          name: look.name,
          isPublic: look.isPublic,
          ownerName: look.user?.name ?? null,
          total: look.items.reduce(
            (sum, item) => sum + (item.product.salePrice ?? item.product.price),
            0,
          ),
          items: look.items.map((item) => ({
            productId: item.product.id,
            name: item.product.name,
            image: item.product.images[0]?.url ?? null,
          })),
        }))}
      />
    </>
  );
}
