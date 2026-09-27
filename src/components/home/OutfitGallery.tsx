import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { GALLERY_OUTFITS } from '@/lib/looks-gallery';
import { cn } from '@/lib/utils';

type Props = {
  /**
   * A strip on the home page, where twenty stacked tiles would bury everything
   * below them; a grid on the looks page, where the outfits are the content.
   */
  layout?: 'strip' | 'grid';
  title?: string;
  description?: string;
};

/**
 * The outfits as the shop actually photographs them: laid out on the carpet,
 * head to toe, one frame per look.
 *
 * The tiles are not links. A photograph shows a whole outfit and there is no
 * page for one outfit, so a click would have to land somewhere it did not
 * promise. The section links to the catalogue once, plainly.
 */
export function OutfitGallery({
  layout = 'strip',
  title = 'Образы из магазина',
  description = 'Так вещи выглядят вместе — снято в LEEBOSS, без стока и ретуши.',
}: Props) {
  return (
    <section className={cn(layout === 'strip' ? 'py-14 sm:py-16' : 'py-10')}>
      <div className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-4 px-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{title}</h2>
          <p className="mt-2 max-w-xl text-sm text-ink-muted">{description}</p>
        </div>

        {layout === 'strip' ? (
          <Link
            href="/catalog"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:text-brand-hover"
          >
            Смотреть каталог
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        ) : null}
      </div>

      {layout === 'strip' ? (
        /*
          Full-bleed on purpose: the strip runs to both edges so it is obvious
          it continues past the screen. Its padding matches the page gutter, so
          the first tile still lines up with the heading above it.
        */
        <ul className="hide-scrollbar mt-8 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:gap-4">
          {GALLERY_OUTFITS.map((outfit) => (
            <li
              key={outfit.file}
              className="relative aspect-square w-[72vw] shrink-0 snap-start overflow-hidden rounded-card bg-surface-alt sm:w-[42vw] lg:w-[23rem]"
            >
              <Image
                src={outfit.file}
                alt={outfit.alt}
                fill
                sizes="(min-width: 1024px) 23rem, (min-width: 640px) 42vw, 72vw"
                className="object-cover transition-transform duration-700 hover:scale-[1.03]"
              />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="mx-auto mt-8 grid max-w-7xl grid-cols-2 gap-3 px-4 sm:gap-4 lg:grid-cols-3">
          {GALLERY_OUTFITS.map((outfit) => (
            <li
              key={outfit.file}
              className="relative aspect-square overflow-hidden rounded-card bg-surface-alt"
            >
              <Image
                src={outfit.file}
                alt={outfit.alt}
                fill
                sizes="(min-width: 1024px) 26rem, 45vw"
                className="object-cover transition-transform duration-700 hover:scale-[1.03]"
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
