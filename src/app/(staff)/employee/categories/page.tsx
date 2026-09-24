import { Permission } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth';
import { CategoriesPanel } from '@/components/staff/CategoriesPanel';
import { StaffHeader } from '@/components/staff/StaffShell';

export default async function CategoriesPage() {
  await requirePermission(Permission.CATEGORIES_MANAGE);

  const sections = await prisma.category.findMany({
    where: { parentId: null },
    orderBy: { sortOrder: 'asc' },
    select: {
      id: true,
      name: true,
      slug: true,
      isActive: true,
      _count: { select: { products: true } },
      children: {
        orderBy: { sortOrder: 'asc' },
        select: {
          id: true,
          name: true,
          slug: true,
          isActive: true,
          _count: { select: { products: true } },
        },
      },
    },
  });

  return (
    <>
      <StaffHeader title="Категории" description="Разделы каталога и их подкатегории." />
      <CategoriesPanel
        tree={sections.map((section) => ({
          id: section.id,
          name: section.name,
          slug: section.slug,
          isActive: section.isActive,
          productCount: section._count.products,
          children: section.children.map((child) => ({
            id: child.id,
            name: child.name,
            slug: child.slug,
            isActive: child.isActive,
            productCount: child._count.products,
            children: [],
          })),
        }))}
      />
    </>
  );
}
