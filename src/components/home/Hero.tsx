import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { HeroShowcase } from '@/components/home/HeroShowcase';
import type { HeroShowcaseData } from '@/lib/carousel';
import { plural } from '@/lib/utils';

/**
 * The first screen.
 *
 * It used to be one photograph and a line about the fitting room. It now shows
 * what the shop actually has - garments, outfits, trainers, turning over by
 * themselves - and says what the shop is, with the count taken from the
 * catalogue rather than written by hand.
 */
export function Hero({
  showcase,
  garments,
  outfits,
}: {
  showcase: HeroShowcaseData;
  garments: number;
  outfits: number;
}) {
  return (
    <section className="mx-auto max-w-7xl px-4 pt-5 sm:pt-10">
      <div className="grid items-center gap-7 lg:grid-cols-[5fr_6fr] lg:gap-14">
        <div className="order-2 lg:order-1">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-brand sm:text-sm">
            Мужская одежда · Душанбе
          </p>

          <h1 className="mt-3 text-balance text-[2rem] font-semibold leading-[1.08] tracking-tight text-ink sm:mt-4 sm:text-5xl lg:text-6xl">
            Одеваем целиком — от кепки до кроссовок
          </h1>

          <p className="mt-4 max-w-lg text-base leading-relaxed text-ink-muted sm:mt-5">
            Готовые образы, собранные в наших залах, и всё по отдельности: тениски, брюки, джинсы,
            обувь. Заберите в ТЦ «Муниса» или «Сиёма Молл» либо закажите с доставкой по
            Таджикистану.
          </p>

          <div className="mt-6 flex flex-wrap gap-3 sm:mt-8">
            <Button asChild size="lg">
              <Link href="/catalog/obrazy">Готовые образы</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/catalog">Каталог</Link>
            </Button>
          </div>

          <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-4 border-t border-line pt-6 sm:mt-10">
            <div>
              <dt className="text-xs text-ink-faint">
                {plural(garments, ['Вещь', 'Вещи', 'Вещей'])} в каталоге
              </dt>
              <dd className="price-figures text-xl font-semibold text-ink">{garments}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-faint">
                {plural(outfits, ['Готовый образ', 'Готовых образа', 'Готовых образов'])}
              </dt>
              <dd className="price-figures text-xl font-semibold text-ink">{outfits}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-faint">Самовывоз из двух залов</dt>
              <dd className="text-xl font-semibold text-ink">Бесплатно</dd>
            </div>
          </dl>
        </div>

        <div className="order-1 lg:order-2">
          <HeroShowcase {...showcase} />
        </div>
      </div>
    </section>
  );
}
