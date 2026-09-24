'use client';

import Image from 'next/image';
import { Check } from 'lucide-react';
import type { Slot } from '@/lib/mannequin/garments';
import { formatAmount } from '@/lib/money';
import { cn } from '@/lib/utils';

export type FittingColor = { key: string; name: string; hex: string };

export type FittingProduct = {
  id: string;
  slug: string;
  name: string;
  brand: string | null;
  price: number;
  subcategory: string;
  slot: Slot;
  fit: 'SLIM' | 'REGULAR' | 'OVERSIZE';
  image: string | null;
  colors: FittingColor[];
  inStock: boolean;
};

export const SLOT_TABS: { slot: Slot; label: string }[] = [
  { slot: 'HEADWEAR', label: 'Головные уборы' },
  { slot: 'TOP', label: 'Верх' },
  { slot: 'OUTERWEAR', label: 'Верхняя одежда' },
  { slot: 'BOTTOM', label: 'Низ' },
  { slot: 'SHOES', label: 'Обувь' },
];

type Props = {
  activeSlot: Slot;
  onSlotChange: (slot: Slot) => void;
  products: FittingProduct[];
  wornBySlot: Partial<Record<Slot, { productId: string; colorKey: string }>>;
  onToggle: (product: FittingProduct) => void;
  onColorChange: (product: FittingProduct, colorKey: string) => void;
};

export function ItemPicker({
  activeSlot,
  onSlotChange,
  products,
  wornBySlot,
  onToggle,
  onColorChange,
}: Props) {
  const visible = products.filter((p) => p.slot === activeSlot);
  const worn = wornBySlot[activeSlot];

  return (
    <div className="flex min-h-0 flex-col">
      <div className="hide-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {SLOT_TABS.map((tab) => {
          const count = products.filter((p) => p.slot === tab.slot).length;
          const filled = Boolean(wornBySlot[tab.slot]);
          return (
            <button
              key={tab.slot}
              type="button"
              onClick={() => onSlotChange(tab.slot)}
              aria-pressed={tab.slot === activeSlot}
              className={cn(
                'inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-sm transition-colors',
                tab.slot === activeSlot
                  ? 'border-ink bg-ink text-white'
                  : 'border-line text-ink-muted hover:border-ink/40',
              )}
            >
              {filled ? <Check className="size-3.5" aria-hidden /> : null}
              {tab.label}
              <span className={cn('price-figures text-xs', tab.slot === activeSlot ? 'text-white/60' : 'text-ink-faint')}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
        {visible.length === 0 ? (
          <p className="rounded-card border border-dashed border-line px-4 py-10 text-center text-sm text-ink-muted">
            В этом разделе пока нет товаров. Он заполнится, как только магазин пришлёт фотографии.
          </p>
        ) : (
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-3">
            {visible.map((product) => {
              const active = worn?.productId === product.id;
              return (
                <li key={product.id}>
                  <button
                    type="button"
                    onClick={() => onToggle(product)}
                    aria-pressed={active}
                    className={cn(
                      'group w-full overflow-hidden rounded-lg border text-left transition-colors',
                      active ? 'border-brand ring-1 ring-brand' : 'border-line hover:border-ink/30',
                    )}
                  >
                    <span className="relative block aspect-3/4 bg-surface-alt">
                      {product.image ? (
                        <Image
                          src={product.image}
                          alt={product.name}
                          fill
                          sizes="140px"
                          className="object-cover"
                        />
                      ) : null}
                      {active ? (
                        <span className="absolute right-1.5 top-1.5 grid size-5 place-items-center rounded-full bg-brand text-white">
                          <Check className="size-3" aria-hidden />
                        </span>
                      ) : null}
                    </span>

                    <span className="block px-2 py-1.5">
                      <span className="block truncate text-[11px] leading-tight text-ink-muted">
                        {product.name}
                      </span>
                      <span className="price-figures block text-xs font-semibold text-ink">
                        {formatAmount(product.price)}
                      </span>
                    </span>
                  </button>

                  {active && product.colors.length > 1 ? (
                    <div className="mt-1.5 flex flex-wrap gap-1 px-0.5">
                      {product.colors.map((color) => (
                        <button
                          key={color.key}
                          type="button"
                          title={color.name}
                          aria-label={color.name}
                          onClick={() => onColorChange(product, color.key)}
                          className={cn(
                            'size-5 rounded-full ring-1 ring-black/10',
                            worn?.colorKey === color.key && 'ring-2 ring-brand ring-offset-1',
                          )}
                          style={{ backgroundColor: color.hex }}
                        />
                      ))}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
