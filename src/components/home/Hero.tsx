import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { HERO_OUTFITS } from '@/lib/looks-gallery';

export function Hero() {
  return (
    <section className="mx-auto max-w-7xl px-4 pt-8 sm:pt-12">
      <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
        <div className="order-2 lg:order-1">
          <p className="rise text-sm font-medium uppercase tracking-[0.18em] text-brand">
            Мужская одежда · Душанбе
          </p>

          <h1
            className="rise mt-4 text-4xl font-semibold leading-[1.08] tracking-tight text-ink sm:text-5xl lg:text-6xl"
            style={{ animationDelay: '60ms' }}
          >
            Примерьте, не выходя из дома
          </h1>

          <p
            className="rise mt-5 max-w-lg text-base leading-relaxed text-ink-muted"
            style={{ animationDelay: '120ms' }}
          >
            Настройте манекен под свой рост и вес, соберите на нём полный образ из вещей LEEBOSS и
            посмотрите, как они сидят, прежде чем оформить заказ.
          </p>

          <div className="rise mt-8 flex flex-wrap gap-3" style={{ animationDelay: '180ms' }}>
            <Button asChild size="lg">
              <Link href="/fitting">Открыть примерочную</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/catalog">Смотреть каталог</Link>
            </Button>
          </div>

          <dl
            className="rise mt-10 flex flex-wrap gap-x-10 gap-y-4 border-t border-line pt-6"
            style={{ animationDelay: '240ms' }}
          >
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

        {/*
          Four outfits rather than one product shot. The right column is offset
          downwards so the pair reads as a spread rather than a table, and each
          tile stays around 300px wide - the size these 588px frames can fill
          without going soft.
        */}
        <div className="order-1 grid grid-cols-2 gap-3 sm:gap-4 lg:order-2">
          <div className="flex flex-col gap-3 sm:gap-4">
            {HERO_OUTFITS.slice(0, 2).map((outfit, index) => (
              <Tile key={outfit.file} outfit={outfit} delay={index * 90} priority={index === 0} />
            ))}
          </div>

          <div className="flex flex-col gap-3 pt-6 sm:gap-4 sm:pt-10">
            {HERO_OUTFITS.slice(2, 4).map((outfit, index) => (
              <Tile key={outfit.file} outfit={outfit} delay={45 + index * 90} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Tile({
  outfit,
  delay,
  priority = false,
}: {
  outfit: { file: string; alt: string };
  delay: number;
  priority?: boolean;
}) {
  return (
    <div
      className="rise relative aspect-square overflow-hidden rounded-card bg-surface-alt"
      style={{ animationDelay: `${delay}ms` }}
    >
      <Image
        src={outfit.file}
        alt={outfit.alt}
        fill
        priority={priority}
        sizes="(min-width: 1024px) 25vw, 45vw"
        className="object-cover"
      />
    </div>
  );
}
