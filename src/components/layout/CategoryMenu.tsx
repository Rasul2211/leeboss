'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type Child = { id: string; slug: string; name: string; _count: { products: number } };
type Section = {
  id: string;
  slug: string;
  name: string;
  children: Child[];
  _count: { products: number };
};

const MORE_LINKS = [
  { href: '/catalog', label: 'Весь каталог' },
  { href: '/fitting', label: 'Виртуальная примерка' },
  { href: '/looks', label: 'Готовые образы' },
  { href: '/delivery', label: 'Доставка и оплата' },
  { href: '/contacts', label: 'Контакты и адреса' },
];

export function CategoryMenu({ tree }: { tree: Section[] }) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  // navigating away must close the panel, otherwise it hangs over the new page
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;

    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    function onClick(event: MouseEvent) {
      const target = event.target as Node;
      if (!panelRef.current?.contains(target) && !buttonRef.current?.contains(target)) {
        setOpen(false);
      }
    }

    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);

    // On a phone the panel is a full sheet. The page under it must stay put,
    // or a swipe meant for the menu scrolls the shop behind it instead.
    const phone = window.matchMedia('(max-width: 639px)').matches;
    const previous = document.body.style.overflow;
    if (phone) document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <div className="shrink-0 sm:relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={open ? 'Закрыть меню' : 'Открыть меню'}
        className={cn(
          'inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors',
          open ? 'bg-brand text-white' : 'bg-surface-alt text-ink hover:bg-line/60',
        )}
      >
        {open ? <X className="size-4" aria-hidden /> : <Menu className="size-4" aria-hidden />}
        <span className="hidden sm:inline">Каталог</span>
      </button>

      {open ? (
        <div
          ref={panelRef}
          className={cn(
            // phone: a sheet from under the header to the bottom of the screen,
            // scrolling on its own. It used to be a box hung from the button,
            // taller than the screen and fixed to the sticky header, so its
            // lower half could not be reached at all.
            'fixed inset-x-0 bottom-0 top-16 z-50 overflow-y-auto overscroll-contain bg-white px-4 pb-10 pt-2',
            // wider screens: the dropdown it always was, now with a height limit
            'sm:absolute sm:inset-auto sm:left-0 sm:top-12 sm:max-h-[calc(100dvh-7rem)] sm:w-[min(92vw,44rem)]',
            'sm:rounded-card sm:border sm:border-line sm:p-5 sm:shadow-xl',
          )}
        >
          <div className="divide-y divide-line sm:grid sm:grid-cols-2 sm:gap-x-8 sm:gap-y-6 sm:divide-y-0 lg:grid-cols-3">
            {tree.map((section) => (
              <div key={section.id} className="py-4 sm:py-0">
                <Link
                  href={`/catalog/${section.slug}`}
                  className="flex items-center justify-between text-base font-semibold text-ink hover:text-brand sm:text-sm"
                >
                  {section.name}
                  <ChevronRight className="size-4 text-ink-faint sm:hidden" aria-hidden />
                </Link>

                {section.children.length ? (
                  <ul className="mt-1 sm:mt-2 sm:space-y-1.5">
                    {section.children.map((child) => (
                      <li key={child.id}>
                        <Link
                          href={`/catalog/${child.slug}`}
                          className="flex min-h-11 items-center justify-between text-[15px] text-ink-muted hover:text-brand sm:inline sm:min-h-0 sm:text-sm"
                        >
                          {child.name}
                          <span className="ml-1.5 text-xs text-ink-faint">
                            {child._count.products}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : section._count.products === 0 ? (
                  // honest empty state: these sections wait for the shop to send photos
                  <p className="mt-2 text-sm text-ink-faint">Скоро в продаже</p>
                ) : null}
              </div>
            ))}
          </div>

          {/* the rest of the site, which on a phone has no other way in but the footer */}
          <ul className="mt-2 border-t border-line pt-3 sm:hidden">
            {MORE_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="flex min-h-11 items-center text-[15px] text-ink hover:text-brand"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
