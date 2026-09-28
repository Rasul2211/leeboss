'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatPrice } from '@/lib/money';
import { cn } from '@/lib/utils';

export type CarouselItem = {
  slug: string;
  name: string;
  brand: string | null;
  price: number;
  image: string;
};

/**
 * One garment at a time, large, with its neighbours showing faintly at the
 * edges so it is obvious the row continues.
 *
 * Scrolling drives the state rather than the other way round: the arrows just
 * scroll, and which item counts as current is read back from the scroll
 * position. That way a swipe on a phone and a click on the arrow end up in the
 * same place, and nothing has to be kept in sync by hand.
 */
export function ProductCarousel({ items }: { items: CarouselItem[] }) {
  const track = useRef<HTMLUListElement>(null);
  const [current, setCurrent] = useState(0);

  const onScroll = useCallback(() => {
    const node = track.current;
    if (!node) return;
    const centre = node.scrollLeft + node.clientWidth / 2;
    const children = Array.from(node.children) as HTMLElement[];
    let nearest = 0;
    let best = Infinity;
    children.forEach((child, index) => {
      const distance = Math.abs(child.offsetLeft + child.offsetWidth / 2 - centre);
      if (distance < best) {
        best = distance;
        nearest = index;
      }
    });
    setCurrent(nearest);
  }, []);

  useEffect(() => {
    onScroll();
  }, [onScroll]);

  function go(step: number) {
    const node = track.current;
    if (!node) return;
    const target = node.children[Math.min(items.length - 1, Math.max(0, current + step))] as
      | HTMLElement
      | undefined;
    if (!target) return;
    node.scrollTo({
      left: target.offsetLeft - (node.clientWidth - target.offsetWidth) / 2,
      behavior: 'smooth',
    });
  }

  if (items.length === 0) return null;
  const item = items[current];

  return (
    <section className="overflow-hidden bg-surface-alt py-14 sm:py-16">
      <div className="mx-auto flex max-w-7xl items-baseline justify-between gap-4 px-4">
        <h2 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          Кроссовки и кеды
        </h2>
        <Link
          href="/catalog/obuv"
          className="text-sm font-medium text-brand hover:text-brand-hover"
        >
          Вся обувь
        </Link>
      </div>

      <ul
        ref={track}
        onScroll={onScroll}
        className="hide-scrollbar mt-8 flex snap-x snap-mandatory gap-6 overflow-x-auto px-[calc(50vw-9rem)] sm:px-[calc(50vw-13rem)]"
      >
        {items.map((entry, index) => (
          <li key={entry.slug} className="w-72 shrink-0 snap-center sm:w-[26rem]">
            <Link href={`/product/${entry.slug}`} className="group block">
              <div
                className={cn(
                  'relative aspect-3/4 overflow-hidden rounded-card bg-white transition-opacity duration-500',
                  index === current ? 'opacity-100' : 'opacity-35',
                )}
              >
                <Image
                  src={entry.image}
                  alt={entry.name}
                  fill
                  sizes="(min-width: 640px) 416px, 288px"
                  className="object-cover"
                />
              </div>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mx-auto mt-6 flex max-w-md items-center justify-between gap-4 px-4">
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={current === 0}
          aria-label="Предыдущая пара"
          className="grid size-10 shrink-0 place-items-center rounded-full border border-line bg-white text-ink transition-colors hover:border-ink/40 disabled:opacity-30"
        >
          <ChevronLeft className="size-4" aria-hidden />
        </button>

        <div className="min-w-0 text-center">
          {item ? (
            <>
              <Link href={`/product/${item.slug}`} className="block truncate text-sm font-semibold text-ink hover:text-brand">
                {item.brand ? `${item.brand} · ` : ''}
                {item.name}
              </Link>
              <p className="price-figures mt-1 text-sm text-brand">{formatPrice(item.price)}</p>
            </>
          ) : null}
          <p className="price-figures mt-2 text-xs text-ink-faint">
            {String(current + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}
          </p>
        </div>

        <button
          type="button"
          onClick={() => go(1)}
          disabled={current === items.length - 1}
          aria-label="Следующая пара"
          className="grid size-10 shrink-0 place-items-center rounded-full border border-line bg-white text-ink transition-colors hover:border-ink/40 disabled:opacity-30"
        >
          <ChevronRight className="size-4" aria-hidden />
        </button>
      </div>
    </section>
  );
}
