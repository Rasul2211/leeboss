import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { CategoryMenu } from '@/components/layout/CategoryMenu';
import { SearchBar } from '@/components/layout/SearchBar';
import { HeaderAccount, StaffLink } from '@/components/layout/HeaderAccount';
import { getCategoryTree } from '@/lib/catalog';

/**
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
      {/* thin utility strip: location and the two shortcuts worth a permanent slot */}
      <div className="hidden border-b border-line/70 md:block">
        <div className="mx-auto flex h-9 max-w-7xl items-center gap-6 px-4 text-xs text-ink-muted">
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-3.5" aria-hidden />
            Душанбе
          </span>
          <Link href="/catalog" className="hover:text-ink">
            Новинки
          </Link>
          <Link href="/looks" className="hover:text-ink">
            Образы
          </Link>
          <Link href="/fitting" className="font-medium text-brand hover:text-brand-hover">
            Собрать образ
          </Link>
          <StaffLink />
        </div>
      </div>

      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 md:gap-5">
        <Link href="/" aria-label="LEEBOSS — на главную" className="shrink-0">
          <Logo height={26} />
        </Link>

        <CategoryMenu tree={tree} />

        <div className="min-w-0 flex-1">
          <SearchBar />
        </div>

        <nav className="flex shrink-0 items-center gap-1 md:gap-2">
          <Link
            href="/contacts"
            className="hidden flex-col items-center px-2 text-[11px] text-ink-muted hover:text-ink lg:flex"
          >
            <MapPin className="size-5" aria-hidden />
            Адреса
          </Link>

          <HeaderAccount />
        </nav>
      </div>
    </header>
  );
}
