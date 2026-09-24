import { Permission } from '@prisma/client';
import { requirePermission } from '@/lib/auth';
import { ProductsTable } from '@/components/staff/ProductsTable';
import { StaffHeader } from '@/components/staff/StaffShell';

type Search = { q?: string; page?: string };

export default async function ProductsPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requirePermission(Permission.PRODUCTS_VIEW);
  const { q, page } = await searchParams;

  return (
    <>
      <StaffHeader title="Товары" description="45 позиций из каталога магазина." />
      <ProductsTable root="/admin" q={q} page={Math.max(1, Number(page) || 1)} />
    </>
  );
}
