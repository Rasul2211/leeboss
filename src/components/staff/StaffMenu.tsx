'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * The staff panel's menu on a phone.
 *
 * On a wide screen the sections are a sidebar and this does nothing. On a phone
 * they used to be one row that scrolled sideways, which hid most of them and
 * left no room for the sign-out button. Here they fold away behind a "Меню"
 * button and open as an ordinary list, top to bottom, sign-out included.
 */
export function StaffMenu({
  brand,
  children,
}: {
  /** The logo and the role badge, always visible. */
  brand: React.ReactNode;
  /** The section links and the account block. */
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // choosing a section closes the list, so the section itself is what is seen
  useEffect(() => setOpen(false), [pathname]);

  return (
    <>
      <div className="flex items-center justify-between gap-3 px-4 py-3 lg:px-5 lg:py-4">
        {brand}

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="staff-menu"
          className={cn(
            'inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors lg:hidden',
            open ? 'bg-brand text-white' : 'bg-surface-alt text-ink',
          )}
        >
          {open ? <X className="size-4" aria-hidden /> : <Menu className="size-4" aria-hidden />}
          Меню
        </button>
      </div>

      <div id="staff-menu" className={cn(open ? 'block' : 'hidden', 'lg:block')}>
        {children}
      </div>
    </>
  );
}
