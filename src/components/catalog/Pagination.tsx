'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Pagination({ page, pages }: { page: number; pages: number }) {
  const pathname = usePathname();
  const params = useSearchParams();

  if (pages <= 1) return null;

  function hrefFor(target: number) {
    const next = new URLSearchParams(params);
    if (target <= 1) next.delete('page');
    else next.set('page', String(target));
    const query = next.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  // a compact window around the current page keeps the control usable on phones
  const numbers = Array.from({ length: pages }, (_, i) => i + 1).filter(
    (n) => n === 1 || n === pages || Math.abs(n - page) <= 1,
  );

  return (
    <nav aria-label="Страницы каталога" className="mt-12 flex items-center justify-center gap-1">
      <PageLink href={hrefFor(page - 1)} disabled={page === 1} label="Предыдущая страница">
        <ChevronLeft className="size-4" aria-hidden />
      </PageLink>

      {numbers.map((n, index) => (
        <span key={n} className="flex items-center gap-1">
          {index > 0 && n - (numbers[index - 1] ?? 0) > 1 ? (
            <span className="px-1 text-ink-faint">…</span>
          ) : null}
          <Link
            href={hrefFor(n)}
            aria-current={n === page ? 'page' : undefined}
            className={cn(
              'price-figures grid h-9 min-w-9 place-items-center rounded-lg px-2 text-sm',
              n === page ? 'bg-brand text-white' : 'text-ink-muted hover:bg-surface-alt',
            )}
          >
            {n}
          </Link>
        </span>
      ))}

      <PageLink href={hrefFor(page + 1)} disabled={page === pages} label="Следующая страница">
        <ChevronRight className="size-4" aria-hidden />
      </PageLink>
    </nav>
  );
}

function PageLink({
  href,
  disabled,
  label,
  children,
}: {
  href: string;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span aria-hidden className="grid size-9 place-items-center rounded-lg text-ink-faint opacity-40">
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      aria-label={label}
      className="grid size-9 place-items-center rounded-lg text-ink-muted hover:bg-surface-alt"
    >
      {children}
    </Link>
  );
}
