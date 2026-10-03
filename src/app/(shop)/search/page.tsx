import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { listProducts } from '@/lib/catalog';
import { ProductGrid } from '@/components/home/Section';

export const metadata: Metadata = { title: 'Поиск', robots: { index: false } };

/**
 * Search is the one listing that cannot be built ahead of time - the words are
 * the visitor's own - so it lives apart from the catalogue and leaves the
 * catalogue free to be served from the CDN.
 */
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const q = (await searchParams).q?.trim() ?? '';
  if (!q) redirect('/catalog');

  const result = await listProducts({ search: q, perPage: 48 });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <nav aria-label="Хлебные крошки" className="text-xs text-ink-faint">
        <Link href="/" className="hover:text-ink">
          Главная
        </Link>
        <span className="mx-1.5">/</span>
        <Link href="/catalog" className="hover:text-ink">
          Каталог
        </Link>
      </nav>

      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
        Поиск: «{q}»
        <span className="price-figures ml-3 text-sm font-normal text-ink-faint">{result.total}</span>
      </h1>

      <div className="mt-8">
        {result.items.length > 0 ? (
          <ProductGrid products={result.items} eager />
        ) : (
          <div className="rounded-card border border-dashed border-line py-20 text-center">
            <p className="text-base font-medium text-ink">Ничего не нашлось</p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-ink-muted">
              Попробуйте изменить запрос или посмотрите весь каталог.
            </p>
            <Link
              href="/catalog"
              className="mt-6 inline-block text-sm font-medium text-brand hover:text-brand-hover"
            >
              Весь каталог
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
