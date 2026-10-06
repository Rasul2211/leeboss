import { ChevronDown } from 'lucide-react';
import { ProductGrid } from '@/components/home/Section';
import { getAllGarments } from '@/lib/home';

/*
  A greeting, then the catalogue. Nothing else: everything the shop has is in
  the grid, and the photographs load as it is scrolled.
*/
export default async function HomePage() {
  const garments = await getAllGarments();

  return (
    <>
      <section className="mx-auto flex max-w-7xl flex-col items-center px-4 pb-14 pt-16 text-center sm:pb-20 sm:pt-24">
        <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-ink-faint">
          Мужская одежда · Душанбе
        </p>
        <h1 className="mt-5 text-4xl font-semibold tracking-tight text-ink sm:text-6xl">
          Добро пожаловать
        </h1>
        <a
          href="#catalog"
          aria-label="К каталогу"
          className="mt-10 grid size-10 place-items-center rounded-full text-ink-faint transition-colors hover:text-ink"
        >
          <ChevronDown className="size-5 animate-bounce" aria-hidden />
        </a>
      </section>

      <section id="catalog" className="mx-auto max-w-7xl scroll-mt-20 px-4">
        <ProductGrid products={garments} eager />
      </section>
    </>
  );
}
