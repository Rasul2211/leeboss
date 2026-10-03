'use client';

import { useTransition } from 'react';
import { Heart } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toggleFavorite } from '@/app/actions/favorites';
import { useShopSession } from '@/components/shop/ShopSession';
import { cn } from '@/lib/utils';

type Props = {
  productId: string;
  /** What to show until the visitor's own favourites have arrived. */
  initial?: boolean;
  className?: string;
};

/**
 * Whether the heart is filled comes from the browser's session, not from the
 * page: the page is the same for every visitor and knows nothing about them.
 */
export function FavoriteButton({ productId, initial = false, className }: Props) {
  const { loaded, user, favorites, setFavorite } = useShopSession();
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const active = favorites.has(productId) || (!loaded && initial);

  function onClick() {
    // a guest is known to be one already; no need to ask the server to say so
    if (loaded && !user) {
      router.push('/login?next=/account/favorites');
      return;
    }

    const next = !active;
    setFavorite(productId, next); // optimistic: the heart must react on the first tap
    startTransition(async () => {
      const result = await toggleFavorite(productId);
      if (result.status === 'unauthenticated') {
        setFavorite(productId, !next);
        router.push('/login?next=/account/favorites');
        return;
      }
      setFavorite(productId, result.status === 'error' ? !next : result.active);
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
        // no backdrop blur: a grid holds two dozen of these, and each one is a
        // separate layer the phone has to re-blur while the page scrolls
        'grid size-9 place-items-center rounded-full bg-white/90',
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
