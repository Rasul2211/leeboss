'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { CarouselItem } from '@/components/home/ProductCarousel';
import { formatPrice } from '@/lib/money';
import { cn } from '@/lib/utils';

type TileProps = {
  items: CarouselItem[];
  label: string;
  /** How long each photograph stays, and how long before the first change. */
  every: number;
  after: number;
  sizes: string;
  /** The tile that is on screen first is loaded ahead of everything else. */
  priority?: boolean;
  className?: string;
};

/**
 * One tile that turns over its photographs by itself.
 *
 * Only the photograph on show and the one about to follow are in the page: a
 * tile holds up to eight, and loading them all at once on a phone would cost
 * more than the whole rest of the first screen.
 */
function Tile({ items, label, every, after, sizes, priority = false, className }: TileProps) {
  const [current, setCurrent] = useState(0);
  const [mounted, setMounted] = useState(1);
  const frame = useRef<HTMLAnchorElement>(null);
  const position = useRef(0);

  useEffect(() => {
    if (items.length < 2) return;
    // someone who asked the system for less motion gets a still picture
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let onScreen = true;
    const watcher = new IntersectionObserver(([entry]) => {
      onScreen = entry?.isIntersecting ?? true;
    });
    if (frame.current) watcher.observe(frame.current);

    let ticker: ReturnType<typeof setInterval> | undefined;
    const start = setTimeout(() => {
      setMounted((count) => Math.max(count, 2)); // fetch the second one ahead of its turn
      ticker = setInterval(() => {
        // nothing turns while the tab is hidden or the tile is scrolled away
        if (document.hidden || !onScreen) return;
        const next = (position.current + 1) % items.length;
        position.current = next;
        setCurrent(next);
        setMounted((count) => Math.max(count, Math.min(items.length, next + 2)));
      }, every);
    }, after);

    return () => {
      clearTimeout(start);
      clearInterval(ticker);
      watcher.disconnect();
    };
  }, [items.length, every, after]);

  const item = items[current];
  if (!item) return null;

  return (
    <Link
      ref={frame}
      href={`/product/${item.slug}`}
      className={cn('group relative block overflow-hidden rounded-card bg-surface-alt', className)}
    >
      {items.slice(0, mounted).map((entry, index) => (
        <Image
          key={entry.slug}
          src={entry.image}
          alt={index === current ? entry.name : ''}
          fill
          sizes={sizes}
          priority={priority && index === 0}
          className={cn(
            'object-cover transition-opacity duration-700',
            index === current ? 'opacity-100' : 'opacity-0',
          )}
        />
      ))}

      <span className="absolute left-2.5 top-2.5 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-medium text-ink">
        {label}
      </span>

      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 pt-10 text-white">
        <span className="block truncate text-sm font-medium">{item.name}</span>
        <span className="price-figures block text-xs text-white/80">{formatPrice(item.price)}</span>
      </span>

      {items.length > 1 ? (
        <span className="absolute right-2.5 top-3 flex gap-1" aria-hidden>
          {items.map((entry, index) => (
            <span
              key={entry.slug}
              className={cn(
                'h-1 rounded-full transition-all duration-500',
                index === current ? 'w-4 bg-white' : 'w-1 bg-white/50',
              )}
            />
          ))}
        </span>
      ) : null}
    </Link>
  );
}

/**
 * The first screen's picture: three tiles, each turning over a different part
 * of the shop - what is worn, whole outfits, trainers - out of step with one
 * another, so something on the screen is always changing but never all at once.
 */
export function HeroShowcase({
  worn,
  outfits,
  shoes,
}: {
  worn: CarouselItem[];
  outfits: CarouselItem[];
  shoes: CarouselItem[];
}) {
  return (
    // 5:4 overall, split 3fr / 2fr: that is the one proportion at which a 3:4
    // tile on the left is exactly as tall as two square tiles on the right
    <div className="grid aspect-5/4 grid-cols-[3fr_2fr] grid-rows-2 gap-2 sm:gap-3">
      <Tile
        items={worn}
        label="Новое в залах"
        every={4200}
        after={2600}
        sizes="(min-width: 1024px) 33vw, 60vw"
        priority
        className="row-span-2"
      />
      <Tile
        items={outfits}
        label="Образ целиком"
        every={4200}
        after={4000}
        sizes="(min-width: 1024px) 22vw, 40vw"
      />
      <Tile
        items={shoes}
        label="Обувь"
        every={4200}
        after={5400}
        sizes="(min-width: 1024px) 22vw, 40vw"
      />
    </div>
  );
}
