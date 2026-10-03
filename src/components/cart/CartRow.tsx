'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useOptimistic, useTransition } from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { removeCartItem, setCartItemQuantity } from '@/app/actions/cart';
import { effectivePrice, formatPrice } from '@/lib/money';
import type { CartItem } from '@/lib/cart';
import { useShopSession } from '@/components/shop/ShopSession';

export function CartRow({ item }: { item: CartItem }) {
  const [pending, startTransition] = useTransition();
  const { bumpCart, setCartCount, refresh } = useShopSession();
  // what the row shows while the server is still being told; it falls back to
  // the real quantity by itself once the page has been re-rendered
  const [quantity, showQuantity] = useOptimistic(item.quantity);
  const { product, size, color, stock } = item.variant;
  const unit = effectivePrice(product.price, product.salePrice);
  const image = product.images[0];

  function change(next: number) {
    // outside the transition: inside it the badge would wait for the server too
    bumpCart(next - quantity);
    startTransition(async () => {
      showQuantity(next);
      const result =
        next < 1 ? await removeCartItem(item.id) : await setCartItemQuantity(item.id, next);
      if (result.ok) setCartCount(result.count);
      else refresh(); // the badge was moved ahead of the server; ask what is true
    });
  }

  // a removed row disappears on the tap, not when the server gets round to it
  if (quantity < 1) return null;

  return (
    <div className="flex gap-4 py-5" data-pending={pending || undefined}>
      <Link
        href={`/product/${product.slug}`}
        className="relative aspect-3/4 w-20 shrink-0 overflow-hidden rounded-md bg-surface-alt sm:w-24"
      >
        {image ? (
          <Image src={image.url} alt={image.alt ?? product.name} fill sizes="96px" className="object-cover" />
        ) : null}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <Link href={`/product/${product.slug}`} className="text-sm font-medium text-ink hover:text-brand">
              {product.brand ? `${product.brand} · ` : ''}
              {product.name}
            </Link>
            <p className="mt-1 text-xs text-ink-muted">
              {/* an outfit records the three sizes the buyer picked; an ordinary
                  product has one, on its variant */}
              {item.sizeNote ? item.sizeNote : color.name}
              {!item.sizeNote && size !== 'ONE' ? ` · размер ${size}` : ''}
            </p>
          </div>

          <p className="price-figures shrink-0 text-sm font-semibold text-ink">
            {formatPrice(unit * quantity)}
          </p>
        </div>

        <div className="mt-auto flex items-center justify-between gap-4 pt-4">
          <div className="inline-flex items-center rounded-lg border border-line">
            <button
              type="button"
              onClick={() => change(quantity - 1)}
              aria-label="Уменьшить количество"
              className="grid size-9 place-items-center text-ink-muted hover:text-ink disabled:opacity-40"
            >
              <Minus className="size-4" aria-hidden />
            </button>
            <span className="price-figures w-8 text-center text-sm">{quantity}</span>
            <button
              type="button"
              onClick={() => change(quantity + 1)}
              disabled={quantity >= stock}
              aria-label="Увеличить количество"
              className="grid size-9 place-items-center text-ink-muted hover:text-ink disabled:opacity-40"
            >
              <Plus className="size-4" aria-hidden />
            </button>
          </div>

          <button
            type="button"
            onClick={() => change(0)}
            className="inline-flex items-center gap-1.5 text-xs text-ink-faint hover:text-brand disabled:opacity-40"
          >
            <Trash2 className="size-4" aria-hidden />
            Удалить
          </button>
        </div>

        {quantity >= stock ? (
          <p className="pt-2 text-xs text-ink-faint">Это всё, что есть в наличии</p>
        ) : null}
      </div>
    </div>
  );
}
