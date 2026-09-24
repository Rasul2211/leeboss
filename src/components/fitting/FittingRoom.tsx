'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bookmark, Loader2, RotateCcw, ShoppingBag, Trash2 } from 'lucide-react';
import { ItemPicker, type FittingProduct } from '@/components/fitting/ItemPicker';
import { ParamControls } from '@/components/fitting/ParamControls';
import type { WornItem } from '@/components/fitting/Garment';
import type { ViewAngle } from '@/components/fitting/FittingScene';
import type { Slot } from '@/lib/mannequin/garments';
import { DEFAULT_BODY, clampBody, type BodyParams } from '@/lib/mannequin/measurements';
import { addOutfitToCart } from '@/app/actions/fitting';
import { saveLook } from '@/app/actions/account';
import { formatPrice } from '@/lib/money';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/field';
import { cn } from '@/lib/utils';

// three.js has no business in the server bundle, and the canvas cannot render
// without a DOM - so the whole scene is client-only and loaded on demand
const FittingScene = dynamic(
  () => import('@/components/fitting/FittingScene').then((m) => m.FittingScene),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-full place-items-center bg-surface-alt">
        <div className="flex items-center gap-2 text-sm text-ink-muted">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Готовим примерочную
        </div>
      </div>
    ),
  },
);

const STORAGE_KEY = 'lb_mannequin';

const VIEWS: { key: ViewAngle; label: string }[] = [
  { key: 'front', label: 'Спереди' },
  { key: 'side', label: 'Сбоку' },
  { key: 'back', label: 'Сзади' },
];

type Worn = Partial<Record<Slot, { productId: string; colorKey: string }>>;

type Props = {
  products: FittingProduct[];
  /** Slots and colours to start with, e.g. when arriving from a saved look. */
  initialWorn?: Worn;
  initialSlot?: Slot;
};

export function FittingRoom({ products, initialWorn = {}, initialSlot = 'TOP' }: Props) {
  const [body, setBody] = useState<BodyParams>(DEFAULT_BODY);
  const [size, setSize] = useState('M');
  const [worn, setWorn] = useState<Worn>(initialWorn);
  const [activeSlot, setActiveSlot] = useState<Slot>(initialSlot);
  const [view, setView] = useState<ViewAngle>('front');
  const [notice, setNotice] = useState<string | null>(null);
  const [lookName, setLookName] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  // a returning visitor should not have to describe their body twice
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as { body?: BodyParams; size?: string };
      if (saved.body) setBody(clampBody(saved.body));
      if (saved.size) setSize(saved.size);
    } catch {
      // private mode or blocked storage: the defaults are perfectly usable
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ body, size }));
    } catch {
      // nothing to do: saving the figure is a convenience, not a requirement
    }
  }, [body, size]);

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const wornItems: WornItem[] = useMemo(() => {
    const out: WornItem[] = [];
    for (const [slot, value] of Object.entries(worn)) {
      if (!value) continue;
      const product = byId.get(value.productId);
      if (!product) continue;
      const color = product.colors.find((c) => c.key === value.colorKey) ?? product.colors[0];
      out.push({
        productId: product.id,
        slot: slot as Slot,
        subcategory: product.subcategory,
        fit: product.fit,
        size,
        hex: color?.hex ?? '#888888',
      });
    }
    return out;
  }, [worn, byId, size]);

  const outfit = useMemo(
    () => wornItems.map((item) => byId.get(item.productId)).filter(Boolean) as FittingProduct[],
    [wornItems, byId],
  );

  const total = outfit.reduce((sum, product) => sum + product.price, 0);

  const toggle = useCallback((product: FittingProduct) => {
    setNotice(null);
    setWorn((current) => {
      const existing = current[product.slot];
      // tapping the item already on the mannequin takes it off
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
          size,
        })),
      );
      setNotice(
        result.ok
          ? result.skipped > 0
            ? `Добавлено ${result.added}. Не хватило размера ${size} у ${result.skipped} вещей.`
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
        // saving belongs to an account, so send them to sign in and come back
        router.push('/login?next=/fitting');
      } else {
        setNotice(result.message);
      }
    });
  }

  return (
    <div className="lg:grid lg:h-[calc(100dvh-4rem)] lg:grid-cols-[1fr_26rem]">
      <div className="relative h-[52vh] min-h-80 lg:h-full">
        <FittingScene body={body} worn={wornItems} view={view} />

        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-4">
          <div className="pointer-events-auto flex gap-1 rounded-full bg-white/90 p-1 shadow-sm backdrop-blur">
            {VIEWS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setView(item.key)}
                aria-pressed={view === item.key}
                className={cn(
                  'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                  view === item.key ? 'bg-ink text-white' : 'text-ink-muted hover:text-ink',
                )}
              >
                {item.label}
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

        <p className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-[11px] text-ink-faint">
          Потяните, чтобы повернуть · колесо или щипок — приблизить
        </p>
      </div>

      <aside className="flex min-h-0 flex-col border-t border-line bg-white lg:border-l lg:border-t-0">
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <h1 className="text-lg font-semibold text-ink">Виртуальная примерочная</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Задайте свои параметры и соберите образ из вещей магазина.
          </p>

          <div className="mt-6">
            <ParamControls body={body} size={size} onBodyChange={setBody} onSizeChange={setSize} />
          </div>

          <hr className="my-6 border-line" />

          <ItemPicker
            activeSlot={activeSlot}
            onSlotChange={setActiveSlot}
            products={products}
            wornBySlot={worn}
            onToggle={toggle}
            onColorChange={changeColor}
          />
        </div>

        <div className="border-t border-line bg-white p-5">
          {outfit.length === 0 ? (
            <p className="text-sm text-ink-muted">
              Выберите вещь, чтобы надеть её на манекен.
            </p>
          ) : (
            <>
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-ink-muted">
                  В образе {outfit.length}
                </span>
                <span className="price-figures text-lg font-semibold text-brand">
                  {formatPrice(total)}
                </span>
              </div>

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
                  onClick={() => setLookName(defaultLookName(outfit.length))}
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
                    placeholder="Название образа"
                    className="h-10"
                  />
                  <Button size="sm" onClick={storeLook} disabled={pending || !lookName.trim()}>
                    {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
                    Сохранить
                  </Button>
                </div>
              )}
            </>
          )}

          {notice ? (
            <p role="status" className="mt-3 flex items-start gap-1.5 text-xs text-ink-muted">
              <RotateCcw className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              {notice}
            </p>
          ) : null}
        </div>
      </aside>
    </div>
  );
}

/** A sensible starting name so nobody has to invent one to save a look. */
function defaultLookName(pieces: number): string {
  const today = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  return `Образ от ${today} · ${pieces} вещей`;
}
