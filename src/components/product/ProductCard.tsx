import Image from 'next/image';
import Link from 'next/link';
import type { ProductCardData } from '@/lib/catalog';
import { effectivePrice, formatPrice } from '@/lib/money';
import { FavoriteButton } from '@/components/product/FavoriteButton';
import { cn } from '@/lib/utils';

type Props = {
  product: ProductCardData;
  isFavorite?: boolean;
  /** Feeds the browser the right image width per breakpoint; the grid is 3-up on desktop. */
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
  sizes = '(min-width: 1024px) 33vw, 50vw',
  priority = false,
  square = false,
  className,
}: Props) {
  const image = product.images[0];
  const price = effectivePrice(product.price, product.salePrice);
  const discount = price < product.price ? Math.round((1 - price / product.price) * 100) : 0;

  return (
    <article className={cn('group relative flex h-full flex-col', className)}>
      <div className="relative overflow-hidden rounded-card bg-surface-alt ring-1 ring-black/5">
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

        <div className="pointer-events-none absolute left-2 top-2 flex flex-col items-start gap-1">
          {discount > 0 ? (
            <span className="price-figures rounded-full bg-brand px-2 py-0.5 text-[11px] font-semibold text-white">
              −{discount}%
            </span>
          ) : null}
          {product.isOutfit && !square ? (
            <span className="rounded-full bg-ink/85 px-2 py-0.5 text-[11px] font-medium text-white">
              Образ целиком
            </span>
          ) : null}
        </div>

        <FavoriteButton
          productId={product.id}
          initial={isFavorite}
          className="absolute right-2 top-2"
        />
      </div>

      <div className="mt-3 flex flex-1 flex-col">
        {product.brand ? (
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-faint">
            {product.brand}
          </p>
        ) : null}

        <h3 className="line-clamp-2 text-sm leading-snug text-ink">
          {/* the whole card is clickable through this overlay, so the grid stays keyboard friendly */}
          <Link href={`/product/${product.slug}`} className="after:absolute after:inset-0">
            {product.name}
          </Link>
        </h3>

        <p className="mt-1.5 flex flex-wrap items-baseline gap-x-2">
          <span
            className={cn(
              'price-figures text-base font-semibold',
              discount > 0 ? 'text-brand' : 'text-ink',
            )}
          >
            {formatPrice(price)}
          </span>
          {discount > 0 ? (
            <span className="price-figures text-xs text-ink-faint line-through">
              {formatPrice(product.price)}
            </span>
          ) : null}
        </p>

        {product.colors.length > 1 ? (
          <ul className="mt-2 flex items-center gap-1" aria-label="Доступные цвета">
            {product.colors.slice(0, 5).map((color) => (
              <li
                key={color.key}
                title={color.name}
                style={{ backgroundColor: color.hex }}
                className="size-3 rounded-full ring-1 ring-black/10"
              />
            ))}
            {product.colors.length > 5 ? (
              <li className="text-xs text-ink-faint">+{product.colors.length - 5}</li>
            ) : null}
          </ul>
        ) : null}
      </div>
    </article>
  );
}
