'use client';

import Link, { useLinkStatus } from 'next/link';
import { ShoppingCart, User } from 'lucide-react';
import { useShopSession } from '@/components/shop/ShopSession';
import { cn } from '@/lib/utils';

/** The two header links that differ per visitor: the account and the basket. */
export function HeaderAccount() {
  const { user, cartCount } = useShopSession();

  return (
    <>
      {/* the shop's own people go straight to their panel; everyone else to
          their account, or to sign in */}
      <Link
        href={user ? (user.staff ? '/admin' : '/account') : '/login'}
        prefetch={false}
        className="flex flex-col items-center px-2 text-[11px] text-ink-muted hover:text-ink"
      >
        <Tapped>
          <User className="size-5" aria-hidden />
        </Tapped>
        <span className="hidden sm:block">{user ? user.name : 'Войти'}</span>
      </Link>

      {/* Not prefetched, on purpose. For a visitor with an empty basket the page
          renders without touching the database, so a prefetch would capture a
          complete "your basket is empty" - and show it after they add their
          first item. The basket is always fetched when it is opened. */}
      <Link
        href="/cart"
        prefetch={false}
        className="relative flex flex-col items-center px-2 text-[11px] text-ink-muted hover:text-ink"
      >
        <Tapped>
          <ShoppingCart className="size-5" aria-hidden />
          {cartCount > 0 ? (
            <span className="absolute -right-2 -top-1.5 grid min-w-4 place-items-center rounded-full bg-brand px-1 text-[10px] font-semibold leading-4 text-white">
              {cartCount > 99 ? '99+' : cartCount}
            </span>
          ) : null}
        </Tapped>
        <span className="hidden sm:block">Корзина</span>
      </Link>
    </>
  );
}

/**
 * Dims the icon from the tap until the page starts to arrive. These two links
 * go to pages rendered per request, so there is a moment of waiting, and the
 * visitor should see that the tap was taken.
 */
function Tapped({ children }: { children: React.ReactNode }) {
  const { pending } = useLinkStatus();
  return (
    <span className={cn('relative transition-opacity', pending && 'animate-pulse opacity-40')}>
      {children}
    </span>
  );
}
