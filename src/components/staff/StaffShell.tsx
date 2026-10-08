import Link from 'next/link';
import {
  Boxes,
  ChartNoAxesColumn,
  LayoutGrid,
  LogOut,
  MessageSquare,
  Package,
  Shirt,
  Star,
  Truck,
  Store,
  Users,
  UserCog,
  Bell,
} from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { STAFF_SECTIONS, type StaffSection } from '@/lib/staff-nav';
import { hasPermission, type CurrentUser } from '@/lib/auth';
import { logout } from '@/app/actions/auth';
import { StaffNavLink } from '@/components/staff/StaffNavLink';
import { StaffMenu } from '@/components/staff/StaffMenu';

const ICONS: Record<StaffSection['icon'], typeof Package> = {
  dashboard: ChartNoAxesColumn,
  orders: Package,
  products: Shirt,
  stock: Boxes,
  categories: LayoutGrid,
  looks: Star,
  customers: Users,
  employees: UserCog,
  reviews: MessageSquare,
  delivery: Truck,
  notifications: Bell,
};

type Props = {
  /** "/admin" or "/employee" */
  root: string;
  title: string;
  user: CurrentUser;
  children: React.ReactNode;
};

export function StaffShell({ root, title, user, children }: Props) {
  // a section the user cannot open is not rendered at all, so the panel never
  // advertises a door that will close in their face
  const sections = STAFF_SECTIONS.filter((section) => hasPermission(user, section.permission));

  return (
    <div className="min-h-dvh bg-surface-alt lg:grid lg:grid-cols-[15rem_1fr]">
      {/* sticky on a phone, so the menu - and the way out - is always one tap away */}
      <aside className="sticky top-0 z-40 max-h-dvh overflow-y-auto border-b border-line bg-white lg:static lg:max-h-none lg:overflow-visible lg:border-b-0 lg:border-r">
        <StaffMenu
          brand={
            <div className="flex min-w-0 items-center gap-2.5">
              <Link href="/" className="inline-flex shrink-0 items-center">
                <Logo height={20} />
              </Link>
              <span className="truncate rounded-full bg-surface-alt px-2 py-0.5 text-[11px] font-medium text-ink-muted">
                {title}
              </span>
            </div>
          }
        >
          <nav className="flex flex-col gap-1 px-3 pb-3">
            {sections.map((section) => {
              const Icon = ICONS[section.icon];
              return (
                <StaffNavLink
                  key={section.key}
                  href={`${root}${section.path}`}
                  exact={section.path === ''}
                >
                  <Icon className="size-4 shrink-0" aria-hidden />
                  {section.label}
                </StaffNavLink>
              );
            })}
          </nav>

          <div className="border-t border-line px-5 py-4">
            <p className="truncate text-sm font-medium text-ink">{user.name}</p>
            <p className="text-xs text-ink-faint">{user.phone}</p>

            <div className="mt-3 flex flex-wrap gap-2 lg:flex-col lg:gap-3">
              <Link
                href="/"
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-line px-3 text-sm text-ink hover:border-brand/40 lg:h-auto lg:border-0 lg:px-0 lg:text-xs lg:text-ink-muted lg:hover:text-brand"
              >
                <Store className="size-4 lg:size-3.5" aria-hidden />
                На сайт
              </Link>
              <form action={logout}>
                <button
                  type="submit"
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-line px-3 text-sm text-brand hover:border-brand/40 lg:h-auto lg:border-0 lg:px-0 lg:text-xs lg:text-ink-muted lg:hover:text-brand"
                >
                  <LogOut className="size-4 lg:size-3.5" aria-hidden />
                  Выйти
                </button>
              </form>
            </div>
          </div>
        </StaffMenu>
      </aside>

      <main className="min-w-0 p-4 sm:p-5 lg:p-8">{children}</main>
    </div>
  );
}

/** Page heading used across every staff screen. */
export function StaffHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink">{title}</h1>
        {description ? <p className="mt-1 text-sm text-ink-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function StaffCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-card border border-line bg-white ${className ?? ''}`}>{children}</div>
  );
}
