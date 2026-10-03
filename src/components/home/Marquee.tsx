'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

/**
 * A row that drifts sideways by itself and loops without a seam.
 *
 * The children are laid out twice and the row slides by exactly half its
 * width, so the end of the first copy meets the start of the second. The
 * movement is a CSS transform, which the phone's compositor runs without
 * touching the page; this component only stops it when the row is off screen,
 * so nothing is animated that nobody is looking at.
 */
export function Marquee({
  children,
  seconds,
  reverse = false,
  className,
}: {
  children: React.ReactNode;
  /** How long one full pass takes. */
  seconds: number;
  reverse?: boolean;
  className?: string;
}) {
  const track = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = track.current;
    if (!node) return;

    const watcher = new IntersectionObserver(
      ([entry]) => {
        node.style.animationPlayState = entry?.isIntersecting ? 'running' : 'paused';
      },
      { rootMargin: '200px 0px' },
    );
    watcher.observe(node.parentElement ?? node);
    return () => watcher.disconnect();
  }, []);

  return (
    <div className={cn('marquee-frame overflow-hidden', className)}>
      <div
        ref={track}
        className={cn('marquee-track flex w-max', reverse && 'marquee-reverse')}
        style={{ animationDuration: `${seconds}s` }}
      >
        <div className="flex shrink-0">{children}</div>
        {/* the second copy exists only to close the loop */}
        <div className="flex shrink-0" aria-hidden>
          {children}
        </div>
      </div>
    </div>
  );
}
