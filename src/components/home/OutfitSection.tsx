import Image from 'next/image';
import Link from 'next/link';
import type { OutfitCardData } from '@/lib/catalog';
import { formatPrice } from '@/lib/money';

/**
 * Whole outfits, each one frame as it was photographed.
 *
 * The picture is shown uncropped: these were shot square with the shoes at the
 * bottom edge, and filling a tall card would cut them off. The price list sits
 * under the photograph, so it is clear what the total is made of before the
 * card is even opened.
 *
 * All of them are here, with no "see all" to follow. On a phone they go two
 * across and the price list is left to the outfit's own page - nineteen
 * full-width cards would be ten screens of scrolling before anything else.
 */
export function OutfitSection({ outfits }: { outfits: OutfitCardData[] }) {
  if (outfits.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:py-16">
      <h2 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Готовые образы</h2>
      <p className="mt-2 max-w-xl text-sm text-ink-muted">
        Собраны и сняты в магазине. Берётся целиком, одной кнопкой.
      </p>

      <ul className="mt-8 grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3">
        {outfits.map((outfit) => {
          const image = outfit.images[0];
          return (
            <li key={outfit.id} className="overflow-hidden rounded-card border border-line">
              <Link href={`/product/${outfit.slug}`} className="group block">
                <div className="relative aspect-square bg-surface-alt">
                  {image ? (
                    <Image
                      src={image.url}
                      alt={image.alt ?? outfit.name}
                      fill
                      sizes="(min-width: 1024px) 416px, 46vw"
                      className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                    />
                  ) : null}
                </div>

                <div className="p-3 sm:p-4">
                  <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-ink group-hover:text-brand">
                    {outfit.name}
                  </h3>

                  <ul className="mt-2 hidden space-y-0.5 sm:block">
                    {outfit.pieces.map((piece) => (
                      <li
                        key={piece.id}
                        className="flex items-baseline justify-between gap-3 text-xs text-ink-muted"
                      >
                        <span className="truncate">{piece.title}</span>
                        <span className="price-figures shrink-0">{formatPrice(piece.price)}</span>
                      </li>
                    ))}
                  </ul>

                  <p className="price-figures mt-2 text-base font-semibold text-brand sm:mt-3 sm:border-t sm:border-line sm:pt-3">
                    {formatPrice(outfit.price)}
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
