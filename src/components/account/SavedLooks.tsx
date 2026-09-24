'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ShoppingBag, Trash2 } from 'lucide-react';
import { deleteLook } from '@/app/actions/account';
import { addLookToCart } from '@/app/actions/cart';
import { formatPrice } from '@/lib/money';
import { Button } from '@/components/ui/button';

export type SavedLook = {
  id: string;
  name: string;
  createdAt: string;
  total: number;
  items: { productId: string; slug: string; name: string; image: string | null }[];
};

export function SavedLooks({ looks }: { looks: SavedLook[] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {looks.map((look) => (
        <LookCard key={look.id} look={look} />
      ))}
    </ul>
  );
}

function LookCard({ look }: { look: SavedLook }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <li className="rounded-card border border-line p-4">
      <Link href={`/fitting?look=${look.id}`} className="group block">
        <ul className="flex gap-1.5">
          {look.items.map((item) => (
            <li
              key={item.productId}
              className="relative aspect-3/4 flex-1 overflow-hidden rounded-md bg-surface-alt"
            >
              {item.image ? (
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  sizes="110px"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : null}
            </li>
          ))}
        </ul>

        <h2 className="mt-3 text-sm font-semibold text-ink group-hover:text-brand">{look.name}</h2>
      </Link>

      <p className="price-figures text-xs text-ink-faint">
        {look.createdAt} · {look.items.length} вещей
      </p>
      <p className="price-figures mt-1 text-sm font-semibold text-ink">{formatPrice(look.total)}</p>

      <div className="mt-3 flex items-center gap-2">
        <Button
          size="sm"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const result = await addLookToCart(look.id);
              if (result.ok) {
                setNotice(
                  result.skipped
                    ? `Добавлено ${result.added}, нет в наличии ${result.skipped}`
                    : `Добавлено ${result.added}`,
                );
                router.refresh();
              } else {
                setNotice(result.message);
              }
            })
          }
        >
          {pending ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <ShoppingBag className="size-3.5" aria-hidden />
          )}
          В корзину
        </Button>

        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              await deleteLook(look.id);
              router.refresh();
            })
          }
          className="inline-flex items-center gap-1.5 text-xs text-ink-faint hover:text-brand disabled:opacity-50"
        >
          <Trash2 className="size-3.5" aria-hidden />
          Удалить
        </button>
      </div>

      {notice ? (
        <p role="status" className="mt-2 text-xs text-ink-muted">
          {notice}
        </p>
      ) : null}
    </li>
  );
}
