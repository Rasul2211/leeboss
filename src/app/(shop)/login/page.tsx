import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Logo } from '@/components/brand/Logo';
import { LoginForm } from '@/components/auth/AuthForm';
import { TelegramNotice } from '@/components/auth/TelegramNotice';
import { getCurrentUser } from '@/lib/auth';

export const metadata: Metadata = { title: 'Вход' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const [{ next }, user] = await Promise.all([searchParams, getCurrentUser()]);
  if (user) redirect('/account');

  return (
    <div className="mx-auto w-full max-w-sm px-4 py-16">
      <div className="text-center">
        <Logo height={24} />
        <h1 className="mt-6 text-2xl font-semibold tracking-tight text-ink">Вход в аккаунт</h1>
        <p className="mt-1.5 text-sm text-ink-muted">
          По номеру телефона — тому же, на который оформляете заказы.
        </p>
      </div>

      <div className="mt-8">
        <LoginForm next={next} />
      </div>

      <TelegramNotice />
    </div>
  );
}
