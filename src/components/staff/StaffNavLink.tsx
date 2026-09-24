'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export function StaffNavLink({
  href,
  exact = false,
  children,
}: {
  href: string;
  exact?: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  // the dashboard lives at the panel root, so it must match exactly or every
  // section would light it up as well
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'inline-flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
        active ? 'bg-brand text-white' : 'text-ink-muted hover:bg-surface-alt hover:text-ink',
      )}
    >
      {children}
    </Link>
  );
}
