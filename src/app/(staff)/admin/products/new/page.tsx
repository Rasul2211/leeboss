import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Permission } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth';
import { StaffHeader } from '@/components/staff/StaffShell';
import { NewProductForm, type CategoryOption } from '@/components/staff/NewProductForm';

export default async function NewProductPage() {
  await requirePermission(Permission.PRODUCTS_MANAGE);

  // only the sections that actually hold goods: the top-level ones are
  // containers, and an outfit has a page of its own
  const rows = await prisma.category.findMany({
    where: { isActive: true, parentId: { not: null }, slug: { not: 'obrazy' } },
    orderBy: [{ parent: { sortOrder: 'asc' } }, { sortOrder: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      sizeType: true,
      parent: { select: { name: true } },
    },
  });

  const categories: CategoryOption[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    parentName: row.parent?.name ?? null,
    sizeType: row.sizeType,
  }));

  return (
    <>
      <Link
        href="/admin/products"
        className="mb-3 inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        Все товары
      </Link>

      <StaffHeader
        title="Новый товар"
        description="Загрузите фотографию, назовите вещь и укажите цену — она сразу появится в каталоге."
      />

      <NewProductForm categories={categories} />
    </>
  );
}
