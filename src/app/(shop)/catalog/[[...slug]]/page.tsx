import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { isSortKey, listProducts, SORT_LABELS } from '@/lib/catalog';
import { getFavoriteIds } from '@/lib/favorites';
import { ProductGrid } from '@/components/home/Section';
import { SortSelect } from '@/components/catalog/SortSelect';
import { Pagination } from '@/components/catalog/Pagination';

type Params = { slug?: string[] };
type Search = { q?: string; sort?: string; page?: string };

async function resolveCategory(slug: string | undefined) {
  if (!slug) return null;
  const category = await prisma.category.findFirst({
    where: { slug, isActive: true },
    select: {
      id: true,
      slug: true,
      name: true,
      parent: { select: { slug: true, name: true } },
      children: { where: { isActive: true }, orderBy: { sortOrder: 'asc' }, select: { slug: true, name: true } },
    },
  });
  if (!category) notFound();
  return category;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const category = await resolveCategory(slug?.[0]);
  return {
    title: category ? category.name : 'Каталог',
    description: category
      ? `${category.name} в магазине LEEBOSS, Душанбе. Примерьте на виртуальном манекене перед покупкой.`
      : 'Каталог мужской одежды, обуви и аксессуаров LEEBOSS в Душанбе.',
  };
}

export default async function CatalogPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Search>;
}) {
  const [{ slug }, search] = await Promise.all([params, searchParams]);
  const category = await resolveCategory(slug?.[0]);

  const sort = isSortKey(search.sort) ? search.sort : 'new';
  const page = Math.max(1, Number(search.page) || 1);

  const [result, favoriteIds] = await Promise.all([
    listProducts({ categorySlug: category?.slug, search: search.q, sort, page }),
    getFavoriteIds(),
  ]);

  const heading = search.q?.trim()
    ? `Поиск: «${search.q.trim()}»`
    : (category?.name ?? 'Весь каталог');

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
          {heading}
          <span className="price-figures ml-3 text-sm font-normal text-ink-faint">
            {result.total}
          </span>
        </h1>
        <SortSelect value={sort} labels={SORT_LABELS} />
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
            <ProductGrid products={result.items} favoriteIds={favoriteIds} />
            <Pagination page={result.page} pages={result.pages} />
          </>
        ) : (
          <EmptyState searching={Boolean(search.q?.trim())} />
        )}
      </div>
    </div>
  );
}

function EmptyState({ searching }: { searching: boolean }) {
  return (
    <div className="rounded-card border border-dashed border-line py-20 text-center">
      <p className="text-base font-medium text-ink">
        {searching ? 'Ничего не нашлось' : 'В этом разделе пока нет товаров'}
      </p>
      <p className="mx-auto mt-2 max-w-sm text-sm text-ink-muted">
        {searching
          ? 'Попробуйте изменить запрос или посмотрите весь каталог.'
          : 'Мы наполняем его прямо сейчас. Загляните в соседние разделы.'}
      </p>
      <Link
        href="/catalog"
        className="mt-6 inline-block text-sm font-medium text-brand hover:text-brand-hover"
      >
        Весь каталог
      </Link>
    </div>
  );
}
