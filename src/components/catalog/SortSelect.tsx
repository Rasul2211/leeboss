'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export function SortSelect({ value, labels }: { value: string; labels: Record<string, string> }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function onChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const next = new URLSearchParams(params);
    next.set('sort', event.target.value);
    next.delete('page'); // a new sort order starts from the first page
    router.push(`${pathname}?${next}`);
  }

  return (
    <label className="inline-flex items-center gap-2 text-sm text-ink-muted">
      <span className="sr-only sm:not-sr-only">Сортировка</span>
      <select
        value={value}
        onChange={onChange}
        className="h-9 rounded-lg border border-line bg-white px-3 text-sm text-ink focus:border-brand focus:outline-none"
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
