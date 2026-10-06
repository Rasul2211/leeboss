import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { CategoryMenu } from '@/components/layout/CategoryMenu';
import { HeaderAccount } from '@/components/layout/HeaderAccount';
import { getCategoryTree } from '@/lib/catalog';

/**
 * Three things and nothing else: the catalogue on the left, the name in the
 * middle, the shop's addresses and the visitor's own links on the right.
 * Search lives inside the catalogue menu.
 *
 * Nothing here reads the visitor's cookies. The header sits on every page, and
 * one cookie read in it would make every page be rendered per request; the
 * account link and the basket badge fill themselves in from the browser.
 */
export async function Header() {
  const tree = await getCategoryTree();

  return (
    // solid, not blurred: a backdrop filter under a sticky bar is repainted on
    // every scrolled frame, and cheap phones drop frames over it
    <header className="sticky top-0 z-50 border-b border-line bg-white">
      <div className="mx-auto grid h-16 max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-2 px-4">
        <div className="justify-self-start">
          <CategoryMenu tree={tree} />
        </div>

        <Link href="/" aria-label="LEEBOSS — на главную" className="justify-self-center">
          <Logo height={26} />
        </Link>

        <nav className="flex items-center justify-self-end">
          <Link
            href="/contacts"
            className="flex flex-col items-center px-2 text-[11px] text-ink-muted hover:text-ink"
          >
            <MapPin className="size-5" aria-hidden />
            <span className="hidden sm:block">Адреса</span>
          </Link>
          <HeaderAccount />
        </nav>
      </div>
    </header>
  );
}
