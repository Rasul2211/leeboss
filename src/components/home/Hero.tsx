import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function Hero() {
  return (
    <section className="mx-auto max-w-7xl px-4 pt-8 sm:pt-12">
      <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
        <div className="order-2 lg:order-1">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-brand">
            Мужская одежда · Душанбе
          </p>

          <h1 className="mt-4 text-4xl font-semibold leading-[1.08] tracking-tight text-ink sm:text-5xl lg:text-6xl">
            Примерьте, не выходя из дома
          </h1>

          <p className="mt-5 max-w-lg text-base leading-relaxed text-ink-muted">
            Настройте манекен под свой рост и вес, соберите на нём полный образ из вещей LEEBOSS и
            посмотрите, как они сидят, прежде чем оформить заказ.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/fitting">Открыть примерочную</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/catalog">Смотреть каталог</Link>
            </Button>
          </div>

          <dl className="mt-10 flex flex-wrap gap-x-10 gap-y-4 border-t border-line pt-6">
            <div>
              <dt className="text-xs text-ink-faint">Магазина в городе</dt>
              <dd className="price-figures text-xl font-semibold text-ink">2</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-faint">Подписчиков в Instagram</dt>
              <dd className="price-figures text-xl font-semibold text-ink">26 600</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-faint">Самовывоз</dt>
              <dd className="text-xl font-semibold text-ink">Бесплатно</dd>
            </div>
          </dl>
        </div>

        <div className="order-1 lg:order-2">
          <div className="relative aspect-4/5 overflow-hidden rounded-card bg-surface-alt">
            <Image
              src="/products/teniska-polo-belaya.jpg"
              alt="Мужская тениска-поло LEEBOSS"
              fill
              priority
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
