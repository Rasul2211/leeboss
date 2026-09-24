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
  className?: string;
};

export function ProductCard({
  product,
  isFavorite = false,
  sizes = '(min-width: 1024px) 33vw, 50vw',
  priority = false,
  className,
}: Props) {
  const image = product.images[0];
  const price = effectivePrice(product.price, product.salePrice);

  return (
    <article className={cn('group relative', className)}>
      <div className="relative overflow-hidden rounded-card bg-surface-alt">
        <Link href={`/product/${product.slug}`} className="block" tabIndex={-1} aria-hidden>
          <div className="relative aspect-3/4">
            {image ? (
              <Image
                src={image.url}
                alt={image.alt ?? product.name}
                fill
                sizes={sizes}
                priority={priority}
                className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
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

      <div className="mt-3 space-y-1">
        <p className="price-figures text-base font-semibold text-ink">{formatPrice(price)}</p>

        <h3 className="text-sm leading-snug text-ink-muted">
          {/* the whole card is clickable through this overlay, so the grid stays keyboard friendly */}
          <Link href={`/product/${product.slug}`} className="after:absolute after:inset-0">
            {product.brand ? <span className="text-ink">{product.brand}</span> : null}
            {product.brand ? ' · ' : null}
            {product.name}
          </Link>
        </h3>

        {product.colors.length > 1 ? (
          <ul className="flex items-center gap-1 pt-0.5" aria-label="Доступные цвета">
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
