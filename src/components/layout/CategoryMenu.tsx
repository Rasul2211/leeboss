'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type Child = { id: string; slug: string; name: string; _count: { products: number } };
type Section = {
  id: string;
  slug: string;
  name: string;
  children: Child[];
  _count: { products: number };
};

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
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [open]);

  return (
    <div className="relative shrink-0">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
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
          className="absolute left-0 top-12 z-50 w-[min(92vw,44rem)] rounded-card border border-line bg-white p-5 shadow-xl"
        >
          <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
            {tree.map((section) => (
              <div key={section.id}>
                <Link
                  href={`/catalog/${section.slug}`}
                  className="text-sm font-semibold text-ink hover:text-brand"
                >
                  {section.name}
                </Link>

                {section.children.length ? (
                  <ul className="mt-2 space-y-1.5">
                    {section.children.map((child) => (
                      <li key={child.id}>
                        <Link
                          href={`/catalog/${child.slug}`}
                          className="text-sm text-ink-muted hover:text-brand"
                        >
                          {child.name}
                          <span className="ml-1.5 text-xs text-ink-faint">
                            {child._count.products}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  // honest empty state: these sections wait for the shop to send photos
                  <p className="mt-2 text-sm text-ink-faint">Скоро в продаже</p>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
