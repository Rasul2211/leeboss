'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { catalogHref, isSortKey } from '@/lib/catalog-url';
import { cn } from '@/lib/utils';

export function SortSelect({
  value,
  category,
  labels,
}: {
  value: string;
  category?: string;
  labels: Record<string, string>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const sort = event.target.value;
    if (!isSortKey(sort)) return;
    // a new sort order starts from the first page
    startTransition(() => router.push(catalogHref({ category, sort })));
  }

  return (
    <label className="inline-flex items-center gap-2 text-sm text-ink-muted">
      <span className="sr-only sm:not-sr-only">Сортировка</span>
      <select
        value={value}
        onChange={onChange}
        className={cn(
          'h-9 rounded-lg border border-line bg-white px-3 text-sm text-ink focus:border-brand focus:outline-none',
          pending && 'opacity-60',
        )}
      >
        {Object.entries(labels).map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}
