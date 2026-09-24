'use client';

import { useMemo, useState, useTransition } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { addToCart } from '@/app/actions/cart';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Color = { id: string; key: string; name: string; hex: string };
type Variant = { id: string; size: string; stock: number; colorId: string };

type Props = {
  colors: Color[];
  variants: Variant[];
  sizeType: 'LETTER' | 'EU' | 'ONE_SIZE';
};

/** Letter sizes must read S, M, L, XL - not alphabetically sorted. */
const LETTER_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'ONE'];

function sortSizes(sizes: string[], sizeType: Props['sizeType']): string[] {
  if (sizeType === 'EU') return [...sizes].sort((a, b) => Number(a) - Number(b));
  return [...sizes].sort((a, b) => LETTER_ORDER.indexOf(a) - LETTER_ORDER.indexOf(b));
}

export function AddToCartForm({ colors, variants, sizeType }: Props) {
  const [colorId, setColorId] = useState(colors[0]?.id ?? '');
  const [size, setSize] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  // sizes depend on the chosen colour: the same shirt may run out in black only
  const sizesForColor = useMemo(() => {
    const rows = variants.filter((v) => v.colorId === colorId);
    const unique = [...new Set(rows.map((v) => v.size))];
    return sortSizes(unique, sizeType).map((value) => ({
      value,
      stock: rows.find((v) => v.size === value)?.stock ?? 0,
    }));
  }, [variants, colorId, sizeType]);

  const selected = variants.find((v) => v.colorId === colorId && v.size === size);
  const oneSize = sizesForColor.length === 1 && sizesForColor[0]?.value === 'ONE';

  function onColorChange(id: string) {
    setColorId(id);
    setSize(null); // the previous size may not exist in the new colour
    setMessage(null);
    setDone(false);
  }

  function onSubmit() {
    const variantId = oneSize ? sizesForColor[0] && variants.find((v) => v.colorId === colorId)?.id : selected?.id;

    if (!variantId) {
      setMessage('Выберите размер');
      return;
    }

    startTransition(async () => {
      const result = await addToCart({ variantId });
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
      {colors.length > 1 ? (
        <fieldset>
          <legend className="text-sm font-medium text-ink">
            Цвет: <span className="font-normal text-ink-muted">{colors.find((c) => c.id === colorId)?.name}</span>
          </legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {colors.map((color) => (
              <button
                key={color.id}
                type="button"
                onClick={() => onColorChange(color.id)}
                aria-pressed={color.id === colorId}
                aria-label={color.name}
                title={color.name}
                className={cn(
                  'size-9 rounded-full ring-1 ring-black/10 transition-transform',
                  color.id === colorId && 'ring-2 ring-brand ring-offset-2',
                )}
                style={{ backgroundColor: color.hex }}
              />
            ))}
          </div>
        </fieldset>
      ) : null}

      {!oneSize ? (
        <fieldset>
          <legend className="text-sm font-medium text-ink">Размер</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {sizesForColor.map((item) => {
              const out = item.stock < 1;
              return (
                <button
                  key={item.value}
                  type="button"
                  disabled={out}
                  onClick={() => {
                    setSize(item.value);
                    setMessage(null);
                  }}
                  aria-pressed={item.value === size}
                  className={cn(
                    'h-10 min-w-12 rounded-lg border px-3 text-sm transition-colors',
                    out && 'cursor-not-allowed border-line text-ink-faint line-through opacity-60',
                    !out && item.value === size && 'border-brand bg-brand text-white',
                    !out && item.value !== size && 'border-line text-ink hover:border-ink/40',
                  )}
                >
                  {item.value}
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      <Button size="lg" className="w-full" onClick={onSubmit} disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
        {done ? <Check className="size-4" aria-hidden /> : null}
        {done ? 'Добавлено в корзину' : 'В корзину'}
      </Button>

      {message ? (
        <p role="alert" className="text-sm text-brand">
          {message}
        </p>
      ) : null}
    </div>
  );
}
