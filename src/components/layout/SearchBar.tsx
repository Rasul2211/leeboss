'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Search } from 'lucide-react';

export function SearchBar() {
  const params = useSearchParams();
  const router = useRouter();
  const [value, setValue] = useState(params.get('q') ?? '');

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const q = value.trim();
    router.push(q ? `/catalog?q=${encodeURIComponent(q)}` : '/catalog');
  }

  return (
    <form onSubmit={onSubmit} role="search" className="relative">
      <label htmlFor="site-search" className="sr-only">
        Поиск по каталогу
      </label>
      <input
        id="site-search"
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Найти в LEEBOSS"
        autoComplete="off"
        className="h-10 w-full rounded-lg border border-line bg-surface-alt pl-10 pr-3 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:bg-white focus:outline-none"
      />
      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint"
        aria-hidden
      />
    </form>
  );
}
