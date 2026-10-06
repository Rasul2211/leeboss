import Image from 'next/image';
import Link from 'next/link';
import type { ProductCardData } from '@/lib/catalog';
import { effectivePrice, formatPrice } from '@/lib/money';
import { FavoriteButton } from '@/components/product/FavoriteButton';
import { cn } from '@/lib/utils';

type Props = {
  product: ProductCardData;
  isFavorite?: boolean;
  /** Feeds the browser the right image width per breakpoint; the grid is 4-up on desktop. */
  sizes?: string;
  priority?: boolean;
  /**
   * A square frame, for a grid made only of outfits. In a mixed grid an outfit
   * keeps the tall frame of its neighbours, so the rows stay level, and is
   * shown whole inside it.
   */
  square?: boolean;
  className?: string;
};

export function ProductCard({
  product,
  isFavorite = false,
  sizes = '(min-width: 1024px) 25vw, 50vw',
  priority = false,
  square = false,
  className,
}: Props) {
  const image = product.images[0];
  const price = effectivePrice(product.price, product.salePrice);
  const discount = price < product.price ? Math.round((1 - price / product.price) * 100) : 0;

  // two lines under the photograph and no more: the price, and the brand -
  // or the name, for the shop's own goods that carry no brand
  const label = product.brand ?? product.name;

  return (
    <article className={cn('group relative', className)}>
      <div className="relative overflow-hidden rounded-card bg-surface-alt">
        <Link href={`/product/${product.slug}`} className="block" tabIndex={-1} aria-hidden>
          <div className={cn('relative', square ? 'aspect-square' : 'aspect-3/4')}>
            {image ? (
              <Image
                src={image.url}
                alt={image.alt ?? product.name}
                fill
                sizes={sizes}
                priority={priority}
                className={cn(
                  'transition-transform duration-500 group-hover:scale-[1.03]',
                  // an outfit is shot square with the shoes at the frame's edge:
                  // filling a tall card with it would cut them off
                  product.isOutfit && !square ? 'object-contain' : 'object-cover',
                )}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-ink-faint">
                Нет фото
              </div>
            )}
          </div>
        </Link>

        <FavoriteButton
          productId={product.id}
          initial={isFavorite}
          className="absolute right-2 top-2"
        />
      </div>

      <p className="price-figures mt-2.5 truncate text-sm font-medium text-ink">
        {formatPrice(price)}
        {discount > 0 ? (
          <span className="ml-2 text-xs font-normal text-ink-faint line-through">
            {formatPrice(product.price)}
          </span>
        ) : null}
      </p>
      <h3 className="mt-0.5 truncate text-xs text-ink-muted">
        {/* the whole card is clickable through this overlay, so the grid stays keyboard friendly */}
        <Link
          href={`/product/${product.slug}`}
          aria-label={product.brand ? `${product.brand} · ${product.name}` : product.name}
          className="after:absolute after:inset-0"
        >
          {label}
        </Link>
      </h3>
    </article>
  );
}
