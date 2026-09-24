import Link from 'next/link';
import { SearchX } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/button';

export const metadata = { title: 'Страница не найдена', robots: { index: false } };

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-4 text-center">
      <Link href="/" aria-label="LEEBOSS — на главную">
        <Logo height={24} />
      </Link>

      <SearchX className="mt-10 size-10 text-ink-faint" aria-hidden />
      <h1 className="mt-5 text-2xl font-semibold text-ink">Страница не найдена</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Возможно, товар сняли с продажи или в адресе опечатка.
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link href="/catalog">В каталог</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/fitting">В примерочную</Link>
        </Button>
      </div>
    </div>
  );
}
