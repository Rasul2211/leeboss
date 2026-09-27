import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Shirt } from 'lucide-react';
import { getPublicLooks } from '@/lib/catalog';
import { effectivePrice, formatPrice } from '@/lib/money';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Готовые образы',
  description:
    'Собранные образы из вещей LEEBOSS: откройте любой в виртуальной примерочной или добавьте целиком в корзину.',
};

export default async function LooksPage() {
  const looks = await getPublicLooks();

  if (looks.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <Shirt className="mx-auto size-9 text-ink-faint" aria-hidden />
        <h1 className="mt-5 text-2xl font-semibold text-ink">Образов пока нет</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Соберите свой в примерочной — манекен подстроится под ваши параметры.
        </p>
        <Button asChild className="mt-6">
          <Link href="/fitting">В примерочную</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Готовые образы</h1>
      <p className="mt-2 max-w-xl text-sm text-ink-muted">
        Каждый образ собран из вещей, которые есть в магазине. Откройте его в примерочной, чтобы
        посмотреть на манекене со своими параметрами.
      </p>

      <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {looks.map((look) => {
          const total = look.items.reduce(
            (sum, item) => sum + effectivePrice(item.product.price, item.product.salePrice),
            0,
          );

          return (
            <li key={look.id} className="rounded-card border border-line p-5">
              <Link href={`/fitting?look=${look.id}`} className="group block">
                <ul className="flex gap-2">
                  {look.items.map((item) => {
                    const image = item.product.images[0];
                    return (
                      <li
                        key={item.product.id}
                        className="relative aspect-3/4 flex-1 overflow-hidden rounded-md bg-surface-alt"
                      >
                        {image ? (
                          <Image
                            src={image.url}
                            alt={item.product.name}
                            fill
                            sizes="(min-width: 1024px) 110px, 22vw"
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : null}
                      </li>
                    );
                  })}
                </ul>

                <h2 className="mt-4 text-base font-semibold text-ink group-hover:text-brand">
                  {look.name}
                </h2>
              </Link>

              <ul className="mt-2 space-y-0.5">
                {look.items.map((item) => (
                  <li key={item.product.id} className="truncate text-xs text-ink-muted">
                    <Link href={`/product/${item.product.slug}`} className="hover:text-brand">
                      {item.product.brand ? `${item.product.brand} · ` : ''}
                      {item.product.name}
                    </Link>
                  </li>
                ))}
              </ul>

              <div className="mt-4 flex items-center justify-between gap-3">
                <span className="price-figures text-base font-semibold text-ink">
                  {formatPrice(total)}
                </span>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/fitting?look=${look.id}`}>Примерить</Link>
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
