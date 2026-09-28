import Link from 'next/link';
import { Plus, Shirt } from 'lucide-react';
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
      <StaffHeader
        title="Товары"
        description="Каталог магазина. Отсюда же заводится новая вещь или готовый образ."
        action={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/products/new"
              className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-brand px-4 text-sm font-medium text-white hover:bg-brand-hover"
            >
              <Plus className="size-4" aria-hidden />
              Новый товар
            </Link>
            <Link
              href="/admin/outfits/new"
              className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-line px-4 text-sm font-medium text-ink hover:border-ink/40"
            >
              <Shirt className="size-4" aria-hidden />
              Новый образ
            </Link>
          </div>
        }
      />
      <ProductsTable root="/admin" q={q} page={Math.max(1, Number(page) || 1)} />
    </>
  );
}
