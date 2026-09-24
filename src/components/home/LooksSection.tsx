import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { ProductCardData } from '@/lib/catalog';
import { effectivePrice, formatPrice } from '@/lib/money';

type Look = {
  id: string;
  name: string;
  items: { slot: string; product: ProductCardData }[];
};

export function LooksSection({ looks }: { looks: Look[] }) {
  if (looks.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            Готовые образы
          </h2>
          <p className="mt-2 max-w-xl text-sm text-ink-muted">
            Собраны из вещей, которые есть в магазине. Откройте образ в примерочной или добавьте
            целиком в корзину.
          </p>
        </div>
        <Link
          href="/looks"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:text-brand-hover"
        >
          Все образы
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>

      <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {looks.map((look) => {
          const total = look.items.reduce(
            (sum, item) => sum + effectivePrice(item.product.price, item.product.salePrice),
            0,
          );

          return (
            <li key={look.id} className="rounded-card border border-line bg-white p-4">
              <Link href={`/fitting?look=${look.id}`} className="group block">
                {/* the pieces stacked as a strip: it reads as an outfit, not a list */}
                <ul className="flex gap-1.5">
                  {look.items.map((item) => {
                    const image = item.product.images[0];
                    return (
                      <li key={item.product.id} className="relative aspect-3/4 flex-1 overflow-hidden rounded-md bg-surface-alt">
                        {image ? (
                          <Image
                            src={image.url}
                            alt={item.product.name}
                            fill
                            sizes="120px"
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : null}
                      </li>
                    );
                  })}
                </ul>

                <h3 className="mt-3 text-sm font-semibold text-ink group-hover:text-brand">
                  {look.name}
                </h3>
              </Link>

              <p className="mt-1 text-xs text-ink-muted">
                {look.items.length} {plural(look.items.length, 'вещь', 'вещи', 'вещей')}
              </p>
              <p className="price-figures mt-2 text-sm font-semibold text-ink">
                {formatPrice(total)}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Russian needs three plural forms; Intl.PluralRules gives the right one. */
function plural(n: number, one: string, few: string, many: string): string {
  const rule = new Intl.PluralRules('ru-RU').select(n);
  if (rule === 'one') return one;
  if (rule === 'few') return few;
  return many;
}
