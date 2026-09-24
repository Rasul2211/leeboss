import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth';
import { AccountNav } from '@/components/account/AccountNav';
import { formatPhone } from '@/lib/validation';

export const metadata: Metadata = { title: 'Личный кабинет', robots: { index: false } };

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  // one guard for the whole area; individual pages can assume a signed-in user
  const user = await requireUser('/account');

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{user.name}</h1>
        <p className="price-figures text-sm text-ink-faint">{formatPhone(user.phone)}</p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[14rem_1fr]">
        <AccountNav />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
