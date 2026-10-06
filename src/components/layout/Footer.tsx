import Link from 'next/link';

/** One quiet line: who, where, and how to reach the shop. */
export function Footer() {
  return (
    <footer className="mt-20 border-t border-line">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-6 text-xs text-ink-faint">
        <p>© {new Date().getFullYear()} LEEBOSS · Душанбе</p>
        <nav className="flex gap-5">
          <Link href="/delivery" className="hover:text-ink">
            Доставка
          </Link>
          <a href="https://t.me/leebosstj" target="_blank" rel="noreferrer noopener" className="hover:text-ink">
            Telegram
          </a>
        </nav>
      </div>
    </footer>
  );
}
