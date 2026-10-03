'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useShopSession } from '@/components/shop/ShopSession';

/**
 * Keeps the basket page honest after a "back".
 *
 * Adding to the basket no longer re-renders anything on the server, so a basket
 * page the browser kept from earlier can be one item behind. When the count the
 * page was rendered with disagrees with what the browser knows, the page is
 * fetched again - once per disagreement, so a real mismatch cannot loop.
 */
export function CartSync({ count }: { count: number }) {
  const { loaded, cartCount } = useShopSession();
  const router = useRouter();
  const asked = useRef<number | null>(null);

  useEffect(() => {
    if (!loaded || cartCount === count || asked.current === cartCount) return;
    asked.current = cartCount;
    router.refresh();
  }, [loaded, cartCount, count, router]);

  return null;
}
