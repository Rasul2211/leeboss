import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getCategoryBySlug, listProducts, SORT_LABELS } from '@/lib/catalog';
import { parseCatalogPath } from '@/lib/catalog-url';
import { ProductGrid } from '@/components/home/Section';
import { SortSelect } from '@/components/catalog/SortSelect';
import { Pagination } from '@/components/catalog/Pagination';

type Params = { slug?: string[] };

/**
 * Each listing is built the first time someone opens it and then kept. Nothing
 * here reads the query string or a cookie - that is what lets the page be kept
 * at all (see lib/catalog-url). Empty for the same reason as on the product
 * page: the deploy does not build them, scripts/warm.mjs opens them afterwards.
 */
export function generateStaticParams(): Params[] {
  return [];
}

async function resolve(segments: string[] | undefined) {
  const view = parseCatalogPath(segments);
  if (!view) notFound();

  const category = view.category ? await getCategoryBySlug(view.category) : null;
  if (view.category && !category) notFound();

  return { view, category };
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const { category } = await resolve(slug);
  return {
    title: category ? category.name : 'Каталог',
    description: category
      ? `${category.name} в магазине LEEBOSS, Душанбе. Примерьте на виртуальном манекене перед покупкой.`
      : 'Каталог мужской одежды, обуви и аксессуаров LEEBOSS в Душанбе.',
  };
}

export default async function CatalogPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const { view, category } = await resolve(slug);

  const result = await listProducts({
    categorySlug: category?.slug,
    sort: view.sort,
    page: view.page,
  });

  // a page past the end is not a page: without this every number would be
  // built and kept, however large
  if (view.page > result.pages) notFound();

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
        {category?.parent ? (
          <>
            <span className="mx-1.5">/</span>
            <Link href={`/catalog/${category.parent.slug}`} className="hover:text-ink">
              {category.parent.name}
            </Link>
          </>
        ) : null}
        {category ? (
          <>
            <span className="mx-1.5">/</span>
            <span className="text-ink">{category.name}</span>
          </>
        ) : null}
      </nav>

      <div className="mt-4 flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          {category?.name ?? 'Весь каталог'}
          <span className="price-figures ml-3 text-sm font-normal text-ink-faint">
            {result.total}
          </span>
        </h1>
        <SortSelect value={view.sort} category={category?.slug} labels={SORT_LABELS} />
      </div>

      {category?.children.length ? (
        <ul className="hide-scrollbar mt-5 flex gap-2 overflow-x-auto pb-1">
          {category.children.map((child) => (
            <li key={child.slug}>
              <Link
                href={`/catalog/${child.slug}`}
                className="inline-flex h-9 items-center whitespace-nowrap rounded-full border border-line px-4 text-sm text-ink-muted transition-colors hover:border-brand hover:text-brand"
              >
                {child.name}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-8">
        {result.items.length > 0 ? (
          <>
            <ProductGrid products={result.items} eager />
            <Pagination
              page={result.page}
              pages={result.pages}
              category={category?.slug}
              sort={view.sort}
            />
          </>
        ) : (
          <div className="rounded-card border border-dashed border-line py-20 text-center">
            <p className="text-base font-medium text-ink">В этом разделе пока нет товаров</p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-ink-muted">
              Мы наполняем его прямо сейчас. Загляните в соседние разделы.
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
