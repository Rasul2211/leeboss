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
  Users,
  UserCog,
} from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { STAFF_SECTIONS, type StaffSection } from '@/lib/staff-nav';
import { hasPermission, type CurrentUser } from '@/lib/auth';
import { logout } from '@/app/actions/auth';
import { StaffNavLink } from '@/components/staff/StaffNavLink';

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
      <aside className="border-b border-line bg-white lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-3 px-5 py-4">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <Logo height={20} />
          </Link>
          <span className="rounded-full bg-surface-alt px-2 py-0.5 text-[11px] font-medium text-ink-muted">
            {title}
          </span>
        </div>

        <nav className="hide-scrollbar flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible">
          {sections.map((section) => {
            const Icon = ICONS[section.icon];
            return (
              <StaffNavLink key={section.key} href={`${root}${section.path}`} exact={section.path === ''}>
                <Icon className="size-4 shrink-0" aria-hidden />
                {section.label}
              </StaffNavLink>
            );
          })}
        </nav>

        <div className="hidden border-t border-line px-5 py-4 lg:block">
          <p className="truncate text-sm font-medium text-ink">{user.name}</p>
          <p className="text-xs text-ink-faint">{user.phone}</p>
          <form action={logout} className="mt-3">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-brand"
            >
              <LogOut className="size-3.5" aria-hidden />
              Выйти
            </button>
          </form>
        </div>
      </aside>

      <main className="min-w-0 p-5 lg:p-8">{children}</main>
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
