'use client';

import { useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { BuilderProduct } from '@/lib/outfit';
import { cn } from '@/lib/utils';

/**
 * One row of the builder: every product for one part of the body, side by
 * side, with the chosen one in the middle.
 *
 * Swiping is the choosing. The row is an ordinary scrolling strip that snaps
 * to its cards, and whichever card ends up in the middle is the chosen one -
 * read back from the scroll position, once per frame. The arrows and a tap on
 * a neighbour only scroll; nothing else decides what is selected, so a swipe,
 * a tap and an arrow can never disagree.
 */
export function SlotSwiper({
  items,
  index,
  onChange,
  label,
}: {
  items: BuilderProduct[];
  index: number;
  onChange: (index: number) => void;
  label: string;
}) {
  const track = useRef<HTMLDivElement>(null);
  const frame = useRef(0);
  /** the card the strip is at, or is on its way to */
  const shown = useRef(-1);

  const scrollTo = useCallback((target: number, behavior: ScrollBehavior) => {
    const node = track.current;
    const card = node?.children[target] as HTMLElement | undefined;
    if (!node || !card) return;
    shown.current = target;
    node.scrollTo({ left: card.offsetLeft - (node.clientWidth - card.offsetWidth) / 2, behavior });
  }, []);

  const measure = useCallback(() => {
    frame.current = 0;
    const node = track.current;
    if (!node) return;
    const centre = node.scrollLeft + node.clientWidth / 2;
    let nearest = 0;
    let best = Infinity;
    for (let i = 0; i < node.children.length; i++) {
      const card = node.children[i] as HTMLElement;
      const distance = Math.abs(card.offsetLeft + card.offsetWidth / 2 - centre);
      if (distance < best) {
        best = distance;
        nearest = i;
      }
    }
    if (nearest !== shown.current) {
      shown.current = nearest;
      onChange(nearest);
    }
  }, [onChange]);

  const onScroll = useCallback(() => {
    if (!frame.current) frame.current = requestAnimationFrame(measure);
  }, [measure]);

  // when the choice is made from outside - a shuffle, a link from a product
  // page - bring the strip to it; when it came from the strip itself, do nothing
  useEffect(() => {
    if (index === shown.current) return;
    scrollTo(index, shown.current === -1 ? 'auto' : 'smooth');
  }, [index, scrollTo]);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  return (
    <div className="group/row relative">
      <div
        ref={track}
        onScroll={onScroll}
        role="listbox"
        aria-label={label}
        className="hide-scrollbar flex snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain px-[calc(50%-4.5rem)] sm:gap-3 sm:px-[calc(50%-6.5rem)]"
      >
        {items.map((item, i) => (
          <button
            key={item.id}
            type="button"
            role="option"
            aria-selected={i === index}
            aria-label={item.name}
            onClick={() => scrollTo(i, 'smooth')}
            className={cn(
              'relative aspect-3/4 w-36 shrink-0 snap-center overflow-hidden rounded-card bg-surface-alt transition-[opacity,transform] duration-300 sm:w-52',
              i === index ? 'opacity-100' : 'scale-[0.94] opacity-35',
            )}
          >
            <Image
              src={item.image}
              alt=""
              fill
              sizes="(min-width: 640px) 208px, 144px"
              className="object-cover"
            />
          </button>
        ))}
      </div>

      {/* arrows for a mouse; a finger does not need them */}
      {(['prev', 'next'] as const).map((side) => {
        const target = side === 'prev' ? index - 1 : index + 1;
        const Icon = side === 'prev' ? ChevronLeft : ChevronRight;
        return (
          <button
            key={side}
            type="button"
            onClick={() => scrollTo(target, 'smooth')}
            disabled={target < 0 || target >= items.length}
            aria-label={side === 'prev' ? `${label}: предыдущая вещь` : `${label}: следующая вещь`}
            className={cn(
              'absolute top-1/2 hidden size-10 -translate-y-1/2 place-items-center rounded-full border border-line bg-white text-ink shadow-sm transition-opacity hover:border-brand/50 disabled:opacity-0 lg:grid',
              side === 'prev' ? 'left-[calc(50%-11rem)]' : 'right-[calc(50%-11rem)]',
            )}
          >
            <Icon className="size-4" aria-hidden />
          </button>
        );
      })}
    </div>
  );
}
