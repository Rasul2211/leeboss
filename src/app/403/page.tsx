import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata = { title: 'Нет доступа', robots: { index: false } };

export default function ForbiddenPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <ShieldAlert className="mx-auto size-10 text-ink-faint" aria-hidden />
      <h1 className="mt-5 text-2xl font-semibold text-ink">Недостаточно прав</h1>
      <p className="mt-2 text-sm text-ink-muted">
        У вашей учётной записи нет доступа к этому разделу. Попросите администратора выдать нужное
        право.
      </p>
      <Button asChild className="mt-6">
        <Link href="/">На главную</Link>
      </Button>
    </div>
  );
}
