import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { ProductCard } from '@/components/product/ProductCard';
import type { ProductCardData } from '@/lib/catalog';

type SectionProps = {
  title: string;
  description?: string;
  href?: string;
  linkLabel?: string;
  children: React.ReactNode;
};

export function Section({ title, description, href, linkLabel = 'Смотреть все', children }: SectionProps) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{title}</h2>
          {description ? <p className="mt-2 max-w-xl text-sm text-ink-muted">{description}</p> : null}
        </div>
        {href ? (
          <Link
            href={href}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:text-brand-hover"
          >
            {linkLabel}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        ) : null}
      </div>
      <div className="mt-8">{children}</div>
    </section>
  );
}

/**
 * The catalogue grid: three across on desktop, two on phones, as agreed.
 *
 * `eager` is for a grid that opens the page: its first row is then loaded ahead
 * of everything else. Left on by default it made the home page preload a row
 * from each of its grids, all far below the fold, ahead of the one photograph
 * actually on screen.
 */
export function ProductGrid({
  products,
  favoriteIds,
  eager = false,
}: {
  products: ProductCardData[];
  /** Only where the page already knows them; elsewhere the hearts fill in from the browser. */
  favoriteIds?: Set<string>;
  eager?: boolean;
}) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-9 lg:grid-cols-3 lg:gap-x-6">
      {products.map((product, index) => (
        <li key={product.id}>
          <ProductCard
            product={product}
            isFavorite={favoriteIds?.has(product.id)}
            priority={eager && index < 2}
          />
        </li>
      ))}
    </ul>
  );
}
