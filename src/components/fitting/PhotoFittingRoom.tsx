'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bookmark, Loader2, ShoppingBag, Trash2 } from 'lucide-react';
import { addOutfitToCart } from '@/app/actions/fitting';
import { saveLook } from '@/app/actions/account';
import { formatPrice } from '@/lib/money';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/field';
import { ItemPicker, type FittingProduct } from '@/components/fitting/ItemPicker';
import type { Slot } from '@/lib/mannequin/garments';
import { cn } from '@/lib/utils';

/**
 * Layers are stacked the way clothes actually go on: a trouser hem falls over
 * the top of a shoe, and an untucked shirt covers the waistband.
 */
const DRAW_ORDER: Slot[] = ['SHOES', 'BOTTOM', 'TOP', 'OUTERWEAR', 'ACCESSORY', 'HEADWEAR'];

const STORAGE_KEY = 'lb_body_type';

export type FittingBodyOption = {
  id: string;
  bodyType: string;
  label: string;
  imageUrl: string;
  width: number;
  height: number;
};

/** product id -> body id -> cut-out layer */
export type LayerIndex = Record<string, Record<string, string>>;

type Worn = Partial<Record<Slot, { productId: string; colorKey: string }>>;

type Props = {
  bodies: FittingBodyOption[];
  products: FittingProduct[];
  layers: LayerIndex;
  initialWorn?: Worn;
  initialSlot?: Slot;
};

export function PhotoFittingRoom({
  bodies,
  products,
  layers,
  initialWorn = {},
  initialSlot = 'TOP',
}: Props) {
  const [bodyId, setBodyId] = useState(bodies[0]?.id ?? '');
  const [worn, setWorn] = useState<Worn>(initialWorn);
  const [activeSlot, setActiveSlot] = useState<Slot>(initialSlot);
  const [notice, setNotice] = useState<string | null>(null);
  const [lookName, setLookName] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  // a returning shopper should not have to pick their build again
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved && bodies.some((b) => b.id === saved)) setBodyId(saved);
    } catch {
      // blocked storage is fine: the first build is a sensible default
    }
  }, [bodies]);

  useEffect(() => {
    try {
      if (bodyId) window.localStorage.setItem(STORAGE_KEY, bodyId);
    } catch {
      // remembering the choice is a convenience, not a requirement
    }
  }, [bodyId]);

  const body = bodies.find((b) => b.id === bodyId) ?? bodies[0];
  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const outfit = useMemo(
    () =>
      Object.values(worn)
        .filter(Boolean)
        .map((value) => byId.get(value!.productId))
        .filter(Boolean) as FittingProduct[],
    [worn, byId],
  );

  /** Only pieces that were actually photographed on this build can be shown. */
  const visible = useMemo(() => {
    if (!body) return [];
    return DRAW_ORDER.flatMap((slot) => {
      const chosen = worn[slot];
      if (!chosen) return [];
      const file = layers[chosen.productId]?.[body.id];
      if (!file) return [];
      const product = byId.get(chosen.productId);
      return [{ slot, file, name: product?.name ?? '' }];
    });
  }, [worn, layers, body, byId]);

  const missing = outfit.filter((p) => body && !layers[p.id]?.[body.id]);
  const total = outfit.reduce((sum, product) => sum + product.price, 0);

  const toggle = useCallback((product: FittingProduct) => {
    setNotice(null);
    setWorn((current) => {
      const existing = current[product.slot];
      if (existing?.productId === product.id) {
        const next = { ...current };
        delete next[product.slot];
        return next;
      }
      return {
        ...current,
        [product.slot]: { productId: product.id, colorKey: product.colors[0]?.key ?? '' },
      };
    });
  }, []);

  const changeColor = useCallback((product: FittingProduct, colorKey: string) => {
    setWorn((current) => ({ ...current, [product.slot]: { productId: product.id, colorKey } }));
  }, []);

  function addAll() {
    if (outfit.length === 0) return;
    startTransition(async () => {
      const result = await addOutfitToCart(
        outfit.map((product) => ({
          productId: product.id,
          colorKey: worn[product.slot]?.colorKey ?? product.colors[0]?.key ?? '',
          size: 'M',
        })),
      );
      setNotice(
        result.ok
          ? result.skipped > 0
            ? `Добавлено ${result.added}, нет в наличии ${result.skipped}`
            : `Добавлено в корзину: ${result.added}`
          : result.message,
      );
    });
  }

  function storeLook() {
    if (!lookName?.trim()) return;
    startTransition(async () => {
      const result = await saveLook({
        name: lookName.trim(),
        items: outfit.map((product) => ({
          productId: product.id,
          slot: product.slot,
          colorKey: worn[product.slot]?.colorKey ?? '',
        })),
      });
      if (result.ok) {
        setLookName(null);
        setNotice('Образ сохранён в личном кабинете');
      } else if (result.message === 'unauthenticated') {
        router.push('/login?next=/fitting');
      } else {
        setNotice(result.message);
      }
    });
  }

  if (!body) return null;

  return (
    <div className="lg:grid lg:h-[calc(100dvh-4rem)] lg:grid-cols-[1fr_26rem]">
      <div className="relative flex min-h-[52vh] items-center justify-center bg-surface-alt p-4 lg:h-full">
        {/* the stack: one base photograph, garments composited on top in order */}
        <div
          className="relative h-full max-h-[78vh] w-auto"
          style={{ aspectRatio: `${body.width} / ${body.height}` }}
        >
          <Image
            src={body.imageUrl}
            alt={`Телосложение: ${body.label.toLowerCase()}`}
            fill
            priority
            sizes="(min-width: 1024px) 50vw, 90vw"
            className="object-contain"
          />

          {visible.map((layer) => (
            <Image
              key={layer.slot}
              src={layer.file}
              alt={layer.name}
              fill
              sizes="(min-width: 1024px) 50vw, 90vw"
              className="object-contain"
            />
          ))}
        </div>

        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-4">
          <div className="pointer-events-auto flex gap-1 rounded-full bg-white/90 p-1 shadow-sm backdrop-blur">
            {bodies.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setBodyId(option.id)}
                aria-pressed={option.id === bodyId}
                className={cn(
                  'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                  option.id === bodyId ? 'bg-ink text-white' : 'text-ink-muted hover:text-ink',
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          {outfit.length > 0 ? (
            <button
              type="button"
              onClick={() => setWorn({})}
              className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-2 text-xs text-ink-muted shadow-sm backdrop-blur hover:text-brand"
            >
              <Trash2 className="size-3.5" aria-hidden />
              Снять всё
            </button>
          ) : null}
        </div>
      </div>

      <aside className="flex min-h-0 flex-col border-t border-line bg-white lg:border-l lg:border-t-0">
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <h1 className="text-lg font-semibold text-ink">Виртуальная примерочная</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Выберите телосложение и соберите образ — вещи снимались на этих же моделях.
          </p>

          <div className="mt-6">
            <ItemPicker
              activeSlot={activeSlot}
              onSlotChange={setActiveSlot}
              products={products}
              wornBySlot={worn}
              onToggle={toggle}
              onColorChange={changeColor}
            />
          </div>
        </div>

        <div className="border-t border-line bg-white p-5">
          {outfit.length === 0 ? (
            <p className="text-sm text-ink-muted">Выберите вещь, чтобы надеть её.</p>
          ) : (
            <>
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-ink-muted">В образе {outfit.length}</span>
                <span className="price-figures text-lg font-semibold text-brand">
                  {formatPrice(total)}
                </span>
              </div>

              {/* said plainly rather than silently showing the body without it */}
              {missing.length > 0 ? (
                <p className="mt-2 text-xs text-ink-muted">
                  Не сняты на этом телосложении: {missing.map((p) => p.name).join(', ')}
                </p>
              ) : null}

              <div className="mt-3 flex gap-2">
                <Button onClick={addAll} disabled={pending} className="flex-1">
                  {pending ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <ShoppingBag className="size-4" aria-hidden />
                  )}
                  Добавить весь образ
                </Button>
                <Button asChild variant="outline">
                  <Link href="/cart">Корзина</Link>
                </Button>
              </div>

              {lookName === null ? (
                <button
                  type="button"
                  onClick={() => setLookName(`Образ из ${outfit.length} вещей`)}
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-brand hover:text-brand-hover"
                >
                  <Bookmark className="size-3.5" aria-hidden />
                  Сохранить образ
                </button>
              ) : (
                <div className="mt-3 flex gap-2">
                  <Input
                    value={lookName}
                    onChange={(event) => setLookName(event.target.value)}
                    aria-label="Название образа"
                    className="h-10"
                  />
                  <Button size="sm" onClick={storeLook} disabled={pending || !lookName.trim()}>
                    Сохранить
                  </Button>
                </div>
              )}
            </>
          )}

          {notice ? (
            <p role="status" className="mt-3 text-xs text-ink-muted">
              {notice}
            </p>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
