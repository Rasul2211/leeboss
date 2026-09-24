'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Heart, LogOut, MapPin, Package, Settings, Shirt, User } from 'lucide-react';
import { logout } from '@/app/actions/auth';
import { cn } from '@/lib/utils';

const LINKS = [
  { href: '/account', label: 'Профиль', icon: User, exact: true },
  { href: '/account/orders', label: 'Заказы', icon: Package },
  { href: '/account/favorites', label: 'Избранное', icon: Heart },
  { href: '/account/looks', label: 'Мои образы', icon: Shirt },
  { href: '/account/addresses', label: 'Адреса', icon: MapPin },
  { href: '/account/settings', label: 'Настройки', icon: Settings },
];

export function AccountNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Личный кабинет">
      <ul className="hide-scrollbar flex gap-1.5 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
        {LINKS.map((link) => {
          const active = link.exact
            ? pathname === link.href
            : pathname === link.href || pathname.startsWith(`${link.href}/`);

          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'inline-flex w-full shrink-0 items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm transition-colors',
                  active ? 'bg-brand text-white' : 'text-ink-muted hover:bg-surface-alt hover:text-ink',
                )}
              >
                <link.icon className="size-4 shrink-0" aria-hidden />
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>

      <form action={logout} className="mt-4 hidden lg:block">
        <button
          type="submit"
          className="inline-flex items-center gap-2 px-3 text-sm text-ink-muted hover:text-brand"
        >
          <LogOut className="size-4" aria-hidden />
          Выйти
        </button>
      </form>
    </nav>
  );
}
