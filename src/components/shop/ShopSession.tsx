'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import type { SessionPayload } from '@/app/api/session/route';

type ShopSession = {
  /** False until the first answer arrives; nothing personal is known before that. */
  loaded: boolean;
  user: SessionPayload['user'];
  cartCount: number;
  favorites: ReadonlySet<string>;
  /** Sets the basket count to what the server just reported. */
  setCartCount: (count: number) => void;
  /** Moves the count at once, before the server has answered. */
  bumpCart: (delta: number) => void;
  setFavorite: (productId: string, active: boolean) => void;
  refresh: () => void;
};

const EMPTY: ReadonlySet<string> = new Set();

const Context = createContext<ShopSession>({
  loaded: false,
  user: null,
  cartCount: 0,
  favorites: EMPTY,
  setCartCount: () => {},
  bumpCart: () => {},
  setFavorite: () => {},
  refresh: () => {},
});

export function useShopSession(): ShopSession {
  return useContext(Context);
}

/** Leaving one of these may have changed who is signed in or what is in the basket. */
const PERSONAL = /^\/(login|register|account|checkout|order)(\/|$)/;

export function ShopSessionProvider({ children }: { children: React.ReactNode }) {
  const [loaded, setLoaded] = useState(false);
  const [user, setUser] = useState<SessionPayload['user']>(null);
  const [cartCount, setCartCount] = useState(0);
  const [favorites, setFavorites] = useState<ReadonlySet<string>>(EMPTY);
  const latest = useRef(0);

  const refresh = useCallback(() => {
    const request = ++latest.current;

    // the server left a note that this browser has no session and no basket;
    // it takes the note away itself when either appears
    if (/(?:^|;\s*)lb_guest=1/.test(document.cookie)) {
      setUser(null);
      setCartCount(0);
      setFavorites(EMPTY);
      setLoaded(true);
      return;
    }

    fetch('/api/session', { cache: 'no-store', credentials: 'same-origin' })
      .then((response) => (response.ok ? (response.json() as Promise<SessionPayload>) : null))
      .then((data) => {
        // a slower, older answer must not overwrite a newer one
        if (!data || request !== latest.current) return;
        setUser(data.user);
        setCartCount(data.cartCount);
        setFavorites(new Set(data.favoriteIds));
        setLoaded(true);
      })
      .catch(() => {
        // offline or a blip: the page still works, it just shows a guest
      });
  }, []);

  useEffect(() => {
    refresh();

    // a page restored from the back-forward cache keeps the state it left with
    function onShow(event: PageTransitionEvent) {
      if (event.persisted) refresh();
    }
    window.addEventListener('pageshow', onShow);
    return () => window.removeEventListener('pageshow', onShow);
  }, [refresh]);

  const pathname = usePathname();
  const previous = useRef(pathname);
  useEffect(() => {
    if (previous.current !== pathname && PERSONAL.test(previous.current)) refresh();
    previous.current = pathname;
  }, [pathname, refresh]);

  const bumpCart = useCallback((delta: number) => {
    setCartCount((count) => Math.max(0, count + delta));
  }, []);

  const setFavorite = useCallback((productId: string, active: boolean) => {
    setFavorites((current) => {
      const next = new Set(current);
      if (active) next.add(productId);
      else next.delete(productId);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ loaded, user, cartCount, favorites, setCartCount, bumpCart, setFavorite, refresh }),
    [loaded, user, cartCount, favorites, bumpCart, setFavorite, refresh],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}
