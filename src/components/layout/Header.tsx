import Link from 'next/link';
import { MapPin, ShoppingCart, User } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { CategoryMenu } from '@/components/layout/CategoryMenu';
import { SearchBar } from '@/components/layout/SearchBar';
import { getCategoryTree } from '@/lib/catalog';
import { getCartCount } from '@/lib/cart';
import { getCurrentUser, isStaff } from '@/lib/auth';

export async function Header() {
  const [tree, cartCount, user] = await Promise.all([
    getCategoryTree(),
    getCartCount(),
    getCurrentUser(),
  ]);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-white/95 backdrop-blur-sm">
      {/* thin utility strip: location and the two shortcuts worth a permanent slot */}
      <div className="hidden border-b border-line/70 md:block">
        <div className="mx-auto flex h-9 max-w-7xl items-center gap-6 px-4 text-xs text-ink-muted">
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-3.5" aria-hidden />
            Душанбе
          </span>
          <Link href="/catalog?sort=new" className="hover:text-ink">
            Новинки
          </Link>
          <Link href="/looks" className="hover:text-ink">
            Образы
          </Link>
          <Link href="/fitting" className="font-medium text-brand hover:text-brand-hover">
            Виртуальная примерка
          </Link>
          {isStaff(user) ? (
            <Link href="/admin" className="ml-auto hover:text-ink">
              Панель управления
            </Link>
          ) : null}
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

          <Link
            href={user ? '/account' : '/login'}
            className="flex flex-col items-center px-2 text-[11px] text-ink-muted hover:text-ink"
          >
            <User className="size-5" aria-hidden />
            <span className="hidden sm:block">{user ? user.name.split(' ')[0] : 'Войти'}</span>
          </Link>

          <Link
            href="/cart"
            className="relative flex flex-col items-center px-2 text-[11px] text-ink-muted hover:text-ink"
          >
            <span className="relative">
              <ShoppingCart className="size-5" aria-hidden />
              {cartCount > 0 ? (
                <span className="absolute -right-2 -top-1.5 grid min-w-4 place-items-center rounded-full bg-brand px-1 text-[10px] font-semibold leading-4 text-white">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              ) : null}
            </span>
            <span className="hidden sm:block">Корзина</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
