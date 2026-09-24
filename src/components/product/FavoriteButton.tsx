'use client';

import { useState, useTransition } from 'react';
import { Heart } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toggleFavorite } from '@/app/actions/favorites';
import { cn } from '@/lib/utils';

type Props = {
  productId: string;
  initial: boolean;
  className?: string;
};

export function FavoriteButton({ productId, initial, className }: Props) {
  const [active, setActive] = useState(initial);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function onClick() {
    const next = !active;
    setActive(next); // optimistic: the heart must react on the first tap
    startTransition(async () => {
      const result = await toggleFavorite(productId);
      if (result.status === 'unauthenticated') {
        setActive(!next);
        router.push('/login?next=/account/favorites');
        return;
      }
      if (result.status === 'error') setActive(!next);
      else setActive(result.active);
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-pressed={active}
      aria-label={active ? 'Убрать из избранного' : 'В избранное'}
      className={cn(
        'grid size-9 place-items-center rounded-full bg-white/85 backdrop-blur-sm',
        'transition-colors hover:bg-white disabled:opacity-60',
        className,
      )}
    >
      <Heart
        className={cn(
          'size-[18px] transition-colors',
          active ? 'fill-brand text-brand' : 'text-ink-muted',
        )}
      />
    </button>
  );
}
