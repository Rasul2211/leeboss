import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getCategoryBySlug, getCategoryTree, listProducts, SORT_LABELS } from '@/lib/catalog';
import { parseCatalogPath } from '@/lib/catalog-url';
import { ProductGrid } from '@/components/home/Section';
import { SortSelect } from '@/components/catalog/SortSelect';
import { Pagination } from '@/components/catalog/Pagination';
import { cn, plural } from '@/lib/utils';

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
      ? `${category.name} в магазине LEEBOSS, Душанбе. Самовывоз из двух залов или доставка по Таджикистану.`
      : 'Каталог мужской одежды и обуви LEEBOSS в Душанбе.',
  };
}

type Category = NonNullable<Awaited<ReturnType<typeof getCategoryBySlug>>>;
type Chip = { href: string; label: string; active: boolean };

/**
 * The row of sections under the heading. It always offers a way sideways and a
 * way up: a section lists its own parts, a part lists its neighbours, and the
 * whole catalogue lists the sections that actually hold something.
 */
async function sectionChips(category: Category | null): Promise<Chip[]> {
  if (!category) {
    const tree = await getCategoryTree();
    const stocked = tree.filter(
      (section) =>
        section._count.products + section.children.reduce((sum, c) => sum + c._count.products, 0) > 0,
    );
    return [
      { href: '/catalog', label: 'Всё', active: true },
      ...stocked.map((section) => ({
        href: `/catalog/${section.slug}`,
        label: section.name,
        active: false,
      })),
    ];
  }

  const group = category.children.length > 0 ? category : category.parent;
  if (!group) return [];

  return [
    { href: `/catalog/${group.slug}`, label: 'Всё', active: group.slug === category.slug },
    ...group.children.map((child) => ({
      href: `/catalog/${child.slug}`,
      label: child.name,
      active: child.slug === category.slug,
    })),
  ];
}

export default async function CatalogPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const { view, category } = await resolve(slug);

  const result = await listProducts({
    categorySlug: category?.slug,
    sort: view.sort,
    page: view.page,
    // the whole section on one page: the photographs load as they are scrolled
    // to, so there is no reason to make a buyer turn pages
    perPage: 120,
  });

  // a page past the end is not a page: without this every number would be
  // built and kept, however large
  if (view.page > result.pages) notFound();

  const chips = await sectionChips(category);

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

      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
        {category?.name ?? 'Весь каталог'}
      </h1>

      {chips.length > 1 ? (
        // bleeds to the screen edge on a phone, so the row visibly continues
        <ul className="hide-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {chips.map((chip) => (
            <li key={chip.href}>
              <Link
                href={chip.href}
                aria-current={chip.active ? 'page' : undefined}
                className={cn(
                  'inline-flex h-9 items-center whitespace-nowrap rounded-full border px-4 text-sm transition-colors',
                  chip.active
                    ? 'border-ink bg-ink text-white'
                    : 'border-line text-ink-muted hover:border-ink/40 hover:text-ink',
                )}
              >
                {chip.label}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-5 flex items-center justify-between gap-4 border-y border-line py-2.5">
        <p className="price-figures text-sm text-ink-muted">
          {result.total}{' '}
          {result.items.every((item) => item.isOutfit)
            ? plural(result.total, ['образ', 'образа', 'образов'])
            : plural(result.total, ['товар', 'товара', 'товаров'])}
        </p>
        <SortSelect value={view.sort} category={category?.slug} labels={SORT_LABELS} />
      </div>

      <div className="mt-6">
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
