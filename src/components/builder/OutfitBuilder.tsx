'use client';

import { useCallback, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bookmark, Check, Plus, Shuffle, X } from 'lucide-react';
import { SlotSwiper } from '@/components/builder/SlotSwiper';
import { useShopSession } from '@/components/shop/ShopSession';
import { addOutfitToCart } from '@/app/actions/fitting';
import { saveLook } from '@/app/actions/account';
import { ROWS, sizesOf, startingSize, type BuilderProduct, type Chosen, type RowSlot } from '@/lib/outfit';
import { formatPrice } from '@/lib/money';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/field';
import { cn, plural } from '@/lib/utils';

type Props = {
  products: BuilderProduct[];
  /** What to open with, when arriving from a product page or a saved look. */
  initial?: Partial<Record<RowSlot, Chosen>>;
};

type RowState = { index: number; on: boolean; colorKey: string | null; size: string | null };

/**
 * Put an outfit together by swiping.
 *
 * Three strips, one under another - top, bottom, shoes - each holding
 * everything the shop has for that part of the body. Whatever sits in the
 * middle of each strip is the outfit; the price under them is its total, and
 * one button puts all of it in the basket. A fourth strip, for a cap or a
 * beanie, is there for whoever wants one.
 */
export function OutfitBuilder({ products, initial = {} }: Props) {
  const router = useRouter();
  const { setCartCount, bumpCart, user } = useShopSession();
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [naming, setNaming] = useState<string | null>(null);

  const lists = useMemo(() => {
    const out = {} as Record<RowSlot, BuilderProduct[]>;
    for (const row of ROWS) out[row.slot] = products.filter((product) => product.slot === row.slot);
    return out;
  }, [products]);

  const [rows, setRows] = useState<Record<RowSlot, RowState>>(() => {
    const out = {} as Record<RowSlot, RowState>;
    for (const row of ROWS) {
      const given = initial[row.slot];
      const found = given ? lists[row.slot].findIndex((product) => product.id === given.productId) : -1;
      out[row.slot] = {
        index: Math.max(0, found),
        // an optional row is shown only if the shopper arrived with something in it
        on: lists[row.slot].length > 0 && (!row.optional || found >= 0),
        colorKey: found >= 0 ? (given?.colorKey ?? null) : null,
        size: null,
      };
    }
    return out;
  });

  const patch = useCallback((slot: RowSlot, change: Partial<RowState>) => {
    setNotice(null);
    setRows((current) => ({ ...current, [slot]: { ...current[slot], ...change } }));
  }, []);

  // what each strip currently adds up to: the product, its colour, its size
  const picks = ROWS.flatMap((row) => {
    const state = rows[row.slot];
    const product = lists[row.slot][state.index];
    if (!state.on || !product) return [];
    const colorKey =
      product.colors.find((color) => color.key === state.colorKey)?.key ?? product.colors[0]?.key ?? '';
    const sizes = sizesOf(product, colorKey);
    return [{ row, product, colorKey, sizes, size: startingSize(sizes, state.size) }];
  });

  const total = picks.reduce((sum, pick) => sum + pick.product.price, 0);

  function shuffle() {
    setNotice(null);
    setRows((current) => {
      const next = { ...current };
      for (const row of ROWS) {
        const count = lists[row.slot].length;
        if (!current[row.slot].on || count < 2) continue;
        // never land on the card already showing: a shuffle that changes
        // nothing looks like a button that does not work
        const step = 1 + Math.floor(Math.random() * (count - 1));
        next[row.slot] = { ...current[row.slot], index: (current[row.slot].index + step) % count, colorKey: null };
      }
      return next;
    });
  }

  function addAll() {
    if (picks.length === 0 || pending) return;
    // answered at once, confirmed by the server a moment later
    bumpCart(picks.length);
    setNotice({ ok: true, text: 'Образ в корзине' });
    startTransition(async () => {
      const result = await addOutfitToCart(
        picks.map((pick) => ({ productId: pick.product.id, colorKey: pick.colorKey, size: pick.size ?? 'ONE' })),
      );
      if (!result.ok) {
        bumpCart(-picks.length);
        setNotice({ ok: false, text: result.message });
        return;
      }
      setCartCount(result.count);
      if (result.skipped > 0) {
        setNotice({
          ok: false,
          text: `В корзину ушло ${result.added} из ${picks.length}: остальное в этом размере разобрали.`,
        });
      }
    });
  }

  function store() {
    const name = naming?.trim();
    if (!name) return;
    startTransition(async () => {
      const result = await saveLook({
        name,
        items: picks.map((pick) => ({ productId: pick.product.id, slot: pick.product.slot, colorKey: pick.colorKey })),
      });
      if (result.ok) {
        setNaming(null);
        setNotice({ ok: true, text: 'Образ сохранён в личном кабинете' });
      } else if (result.message === 'unauthenticated') {
        router.push('/login?next=/fitting');
      } else {
        setNotice({ ok: false, text: result.message });
      }
    });
  }

  return (
    <div className="mx-auto max-w-7xl pb-28 pt-6 sm:pt-10 lg:grid lg:grid-cols-[1fr_22rem] lg:gap-10 lg:px-4 lg:pb-16">
      <div className="min-w-0">
        <div className="flex flex-wrap items-end justify-between gap-3 px-4 lg:px-0">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Соберите образ</h1>
            <p className="mt-1.5 text-sm text-ink-muted">Листайте верх, низ и обувь — цена считается сама.</p>
          </div>
          <Button variant="outline" size="sm" onClick={shuffle}>
            <Shuffle className="size-4" aria-hidden />
            Случайный образ
          </Button>
        </div>

        <div className="mt-6 space-y-2 sm:space-y-3">
          {ROWS.map((row) => {
            const state = rows[row.slot];
            const list = lists[row.slot];
            if (list.length === 0) return null;

            if (!state.on) {
              return (
                <div key={row.slot} className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => patch(row.slot, { on: true })}
                    className="inline-flex h-9 items-center gap-1.5 rounded-full border border-dashed border-line px-4 text-sm text-ink-muted hover:border-brand/50 hover:text-ink"
                  >
                    <Plus className="size-4" aria-hidden />
                    {row.label}
                  </button>
                </div>
              );
            }

            const product = list[state.index];
            return (
              <section key={row.slot} aria-label={row.label}>
                <SlotSwiper
                  items={list}
                  index={state.index}
                  label={row.label}
                  // a different product has its own colours; start it on its first
                  onChange={(index) => patch(row.slot, { index, colorKey: null })}
                />
                <p className="mt-1.5 flex items-center justify-center gap-2 px-4 text-center text-xs text-ink-muted">
                  <span className="truncate">
                    <span className="text-ink">{product?.name}</span>
                    {product ? ` · ${formatPrice(product.price)}` : ''}
                  </span>
                  {row.optional ? (
                    <button
                      type="button"
                      onClick={() => patch(row.slot, { on: false })}
                      aria-label={`Убрать: ${row.label.toLowerCase()}`}
                      className="grid size-5 shrink-0 place-items-center rounded-full bg-surface-alt text-ink-muted hover:text-brand"
                    >
                      <X className="size-3" aria-hidden />
                    </button>
                  ) : null}
                </p>
              </section>
            );
          })}
        </div>
      </div>

      {/* what the strips add up to: sizes, the total, and the way to the basket */}
      <aside className="mt-8 px-4 lg:sticky lg:top-28 lg:mt-0 lg:self-start lg:px-0">
        <div className="rounded-card border border-line p-5">
          <h2 className="text-base font-semibold text-ink">Ваш образ</h2>

          <ul className="mt-3 divide-y divide-line">
            {picks.map((pick) => (
              <li key={pick.row.slot} className="py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <Link
                    href={`/product/${pick.product.slug}`}
                    className="min-w-0 truncate text-sm text-ink hover:text-brand"
                  >
                    {pick.product.name}
                  </Link>
                  <span className="price-figures shrink-0 text-sm text-ink-muted">
                    {formatPrice(pick.product.price)}
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {pick.product.colors.length > 1
                    ? pick.product.colors.map((color) => (
                        <button
                          key={color.key}
                          type="button"
                          onClick={() => patch(pick.row.slot, { colorKey: color.key })}
                          aria-pressed={color.key === pick.colorKey}
                          aria-label={color.name}
                          title={color.name}
                          style={{ backgroundColor: color.hex }}
                          className={cn(
                            'size-6 rounded-full ring-1 ring-line',
                            color.key === pick.colorKey && 'ring-2 ring-brand ring-offset-2',
                          )}
                        />
                      ))
                    : null}

                  {pick.sizes.length > 1 || pick.sizes[0] !== 'ONE'
                    ? pick.sizes.map((size) => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => patch(pick.row.slot, { size })}
                          aria-pressed={size === pick.size}
                          className={cn(
                            'price-figures h-8 min-w-9 rounded-lg border px-2 text-xs transition-colors',
                            size === pick.size
                              ? 'border-brand bg-brand text-white'
                              : 'border-line text-ink hover:border-brand/50',
                          )}
                        >
                          {size}
                        </button>
                      ))
                    : null}
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-2 flex items-baseline justify-between border-t border-line pt-4">
            <span className="text-sm text-ink-muted">
              {picks.length} {plural(picks.length, ['вещь', 'вещи', 'вещей'])}
            </span>
            <span className="price-figures text-xl font-semibold text-brand">{formatPrice(total)}</span>
          </div>

          <Button size="lg" className="mt-4 hidden w-full lg:inline-flex" onClick={addAll} aria-busy={pending}>
            Взять образ целиком
          </Button>

          {naming === null ? (
            <button
              type="button"
              onClick={() => (user ? setNaming('') : router.push('/login?next=/fitting'))}
              className="mt-4 inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-brand"
            >
              <Bookmark className="size-4" aria-hidden />
              Сохранить образ
            </button>
          ) : (
            <div className="mt-4 flex gap-2">
              <Input
                value={naming}
                onChange={(event) => setNaming(event.target.value)}
                placeholder="Название образа"
                aria-label="Название образа"
                className="min-w-0 flex-1"
                autoFocus
              />
              <Button size="sm" className="h-auto" onClick={store} disabled={pending || !naming.trim()}>
                <Check className="size-4" aria-hidden />
              </Button>
            </div>
          )}

          {notice ? (
            <p role="status" className={cn('mt-3 text-sm', notice.ok ? 'text-ink-muted' : 'text-brand')}>
              {notice.text}
              {notice.ok && notice.text === 'Образ в корзине' ? (
                <>
                  {' · '}
                  <Link href="/cart" prefetch={false} className="font-medium text-brand hover:text-brand-hover">
                    Открыть корзину
                  </Link>
                </>
              ) : null}
            </p>
          ) : null}
        </div>
      </aside>

      {/* on a phone the total and the button stay in reach while the strips are swiped */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white px-4 py-3 lg:hidden">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <div className="min-w-0">
            <p className="text-xs text-ink-muted">
              {picks.length} {plural(picks.length, ['вещь', 'вещи', 'вещей'])}
            </p>
            <p className="price-figures text-lg font-semibold leading-tight text-brand">{formatPrice(total)}</p>
          </div>
          <Button className="flex-1" onClick={addAll} aria-busy={pending}>
            {notice?.ok && notice.text === 'Образ в корзине' ? <Check className="size-4" aria-hidden /> : null}
            {notice?.ok && notice.text === 'Образ в корзине' ? 'В корзине' : 'Взять образ'}
          </Button>
        </div>
      </div>
    </div>
  );
}
