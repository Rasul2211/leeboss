'use client';

import { useState, useTransition } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { addToCart } from '@/app/actions/cart';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * An outfit goes into the basket as one line, but its pieces are sized
 * separately, so the buyer picks three sizes here. They travel with the cart
 * line and are written onto the order, which saves the shop a phone call.
 */
const TOP_SIZES = ['S', 'M', 'L', 'XL'];
const BOTTOM_SIZES = ['S', 'M', 'L', 'XL'];
const SHOE_SIZES = ['40', '41', '42', '43', '44'];

type Props = { variantId: string; inStock: boolean; hasShoes: boolean };

export function AddOutfitToCartForm({ variantId, inStock, hasShoes }: Props) {
  const [top, setTop] = useState<string | null>(null);
  const [bottom, setBottom] = useState<string | null>(null);
  const [shoes, setShoes] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSubmit() {
    if (!top || !bottom || (hasShoes && !shoes)) {
      setMessage('Выберите все размеры');
      return;
    }

    const note = [`Верх ${top}`, `Низ ${bottom}`, hasShoes ? `Обувь ${shoes}` : null]
      .filter(Boolean)
      .join(' · ');

    startTransition(async () => {
      const result = await addToCart({ variantId, sizeNote: note });
      if (result.ok) {
        setDone(true);
        setMessage(null);
        setTimeout(() => setDone(false), 2500);
      } else {
        setMessage(result.message);
      }
    });
  }

  return (
    <div className="space-y-5">
      <SizeRow label="Размер верха" sizes={TOP_SIZES} value={top} onChange={(v) => { setTop(v); setMessage(null); }} />
      <SizeRow label="Размер низа" sizes={BOTTOM_SIZES} value={bottom} onChange={(v) => { setBottom(v); setMessage(null); }} />
      {hasShoes ? (
        <SizeRow label="Размер обуви" sizes={SHOE_SIZES} value={shoes} onChange={(v) => { setShoes(v); setMessage(null); }} />
      ) : null}

      <Button size="lg" className="w-full" onClick={onSubmit} disabled={pending || !inStock}>
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
        {done ? <Check className="size-4" aria-hidden /> : null}
        {done ? 'Образ в корзине' : 'Взять образ целиком'}
      </Button>

      {message ? (
        <p role="alert" className="text-sm text-brand">
          {message}
        </p>
      ) : null}
    </div>
  );
}

function SizeRow({
  label,
  sizes,
  value,
  onChange,
}: {
  label: string;
  sizes: string[];
  value: string | null;
  onChange: (size: string) => void;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-medium text-ink">{label}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {sizes.map((size) => (
          <button
            key={size}
            type="button"
            onClick={() => onChange(size)}
            aria-pressed={size === value}
            className={cn(
              'h-10 min-w-12 rounded-lg border px-3 text-sm transition-colors',
              size === value ? 'border-brand bg-brand text-white' : 'border-line text-ink hover:border-ink/40',
            )}
          >
            {size}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
