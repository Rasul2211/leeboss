'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

type Entry = {
  id: string;
  /** Which section the card belongs to: "verh", "niz", "obuv"... */
  section: string;
  /** The card itself, rendered on the server. */
  card: React.ReactNode;
};

/**
 * The whole catalogue on the home page, with a row of sections to narrow it.
 *
 * Every card is in the page from the start - that is the point: nothing to
 * tap through to, the photographs load as they are scrolled to. The row above
 * only hides what does not belong to the chosen section; it fetches nothing,
 * so it answers on the tap.
 */
export function HomeCatalog({
  sections,
  entries,
}: {
  sections: { slug: string; name: string; count: number }[];
  entries: Entry[];
}) {
  const [chosen, setChosen] = useState<string | null>(null);

  return (
    <>
      <ul className="hide-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <li>
          <Chip active={chosen === null} onClick={() => setChosen(null)}>
            Всё <span className="price-figures opacity-60">{entries.length}</span>
          </Chip>
        </li>
        {sections.map((section) => (
          <li key={section.slug}>
            <Chip active={chosen === section.slug} onClick={() => setChosen(section.slug)}>
              {section.name} <span className="price-figures opacity-60">{section.count}</span>
            </Chip>
          </li>
        ))}
      </ul>

      <ul className="mt-6 grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-4 lg:grid-cols-4 lg:gap-x-6 lg:gap-y-10">
        {entries.map((entry) => (
          <li key={entry.id} hidden={chosen !== null && entry.section !== chosen}>
            {entry.card}
          </li>
        ))}
      </ul>
    </>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full border px-4 text-sm transition-colors',
        active
          ? 'border-ink bg-ink text-white'
          : 'border-line text-ink-muted hover:border-ink/40 hover:text-ink',
      )}
    >
      {children}
    </button>
  );
}
