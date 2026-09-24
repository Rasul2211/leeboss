'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { setLookPublic } from '@/app/actions/staff';
import { formatPrice } from '@/lib/money';
import { Button } from '@/components/ui/button';

export type LookRow = {
  id: string;
  name: string;
  isPublic: boolean;
  ownerName: string | null;
  total: number;
  items: { productId: string; name: string; image: string | null }[];
};

export function LooksPanel({ looks }: { looks: LookRow[] }) {
  if (looks.length === 0) {
    return (
      <p className="rounded-card border border-dashed border-line px-5 py-14 text-center text-sm text-ink-faint">
        Образов пока нет
      </p>
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {looks.map((look) => (
        <LookCard key={look.id} look={look} />
      ))}
    </ul>
  );
}

function LookCard({ look }: { look: LookRow }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <li className="rounded-card border border-line bg-white p-4">
      <ul className="flex gap-1.5">
        {look.items.map((item) => (
          <li
            key={item.productId}
            className="relative aspect-3/4 flex-1 overflow-hidden rounded-md bg-surface-alt"
          >
            {item.image ? (
              <Image src={item.image} alt={item.name} fill sizes="90px" className="object-cover" />
            ) : null}
          </li>
        ))}
      </ul>

      <h3 className="mt-3 text-sm font-medium text-ink">{look.name}</h3>
      <p className="text-xs text-ink-muted">
        {look.ownerName ? `Собрал ${look.ownerName}` : 'Образ магазина'} · {look.items.length} вещей
      </p>
      <p className="price-figures mt-1 text-sm font-semibold text-ink">{formatPrice(look.total)}</p>

      <div className="mt-3 flex items-center gap-2">
        <Button
          size="sm"
          variant={look.isPublic ? 'outline' : 'primary'}
          disabled={pending}
          onClick={() =>
            start(async () => {
              await setLookPublic(look.id, !look.isPublic);
              router.refresh();
            })
          }
        >
          {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
          {look.isPublic ? 'Убрать с главной' : 'Показать на главной'}
        </Button>

        <Link
          href={`/fitting?look=${look.id}`}
          className="text-xs text-brand hover:text-brand-hover"
        >
          В примерочной
        </Link>
      </div>
    </li>
  );
}
