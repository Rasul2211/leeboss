import type { Metadata } from 'next';
import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import { cartSubtotal, getCartItems } from '@/lib/cart';
import { formatPrice } from '@/lib/money';
import { CartRow } from '@/components/cart/CartRow';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Корзина' };

export default async function CartPage() {
  const items = await getCartItems();
  const subtotal = cartSubtotal(items);

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <ShoppingBag className="mx-auto size-10 text-ink-faint" aria-hidden />
        <h1 className="mt-5 text-2xl font-semibold text-ink">Корзина пуста</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Загляните в каталог или соберите образ на виртуальном манекене.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link href="/catalog">В каталог</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/fitting">В примерочную</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Корзина</h1>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_20rem]">
        <ul className="divide-y divide-line border-y border-line">
          {items.map((item) => (
            <li key={item.id}>
              <CartRow item={item} />
            </li>
          ))}
        </ul>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="rounded-card border border-line p-6">
            <h2 className="text-base font-semibold text-ink">Итого</h2>

            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-muted">Товары</dt>
                <dd className="price-figures text-ink">{formatPrice(subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-muted">Доставка</dt>
                <dd className="text-ink-muted">рассчитается при оформлении</dd>
              </div>
            </dl>

            <div className="mt-4 flex items-baseline justify-between border-t border-line pt-4">
              <span className="text-sm font-medium text-ink">К оплате</span>
              <span className="price-figures text-xl font-semibold text-brand">
                {formatPrice(subtotal)}
              </span>
            </div>

            <Button asChild size="lg" className="mt-6 w-full">
              <Link href="/checkout">Оформить заказ</Link>
            </Button>

            {subtotal < 500 ? (
              <p className="mt-3 text-xs text-ink-muted">
                До бесплатной доставки по Душанбе не хватает {formatPrice(500 - subtotal)}.
              </p>
            ) : (
              <p className="mt-3 text-xs text-ink-muted">
                Доставка по Душанбе бесплатно. Самовывоз из залов — всегда бесплатно.
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
