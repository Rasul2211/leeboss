'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Check, Loader2 } from 'lucide-react';
import { updateStock } from '@/app/actions/staff';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type StockRowData = {
  id: string;
  size: string;
  stock: number;
  colorName: string;
  productId: string;
  productName: string;
  brand: string | null;
};

export function StockTable({ root, rows }: { root: string; rows: StockRowData[] }) {
  const [onlyLow, setOnlyLow] = useState(false);
  const visible = onlyLow ? rows.filter((row) => row.stock <= 2) : rows;

  return (
    <div className="space-y-4">
      <label className="inline-flex items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          checked={onlyLow}
          onChange={(event) => setOnlyLow(event.target.checked)}
          className="size-4 accent-[var(--color-brand)]"
        />
        Только заканчивающиеся
        <span className="price-figures text-xs text-ink-faint">
          {rows.filter((row) => row.stock <= 2).length}
        </span>
      </label>

      <div className="rounded-card border border-line bg-white">
        {visible.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-ink-faint">Здесь пусто</p>
        ) : (
          <ul className="divide-y divide-line">
            {visible.map((row) => (
              <Row key={row.id} root={root} row={row} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Row({ root, row }: { root: string; row: StockRowData }) {
  const router = useRouter();
  const [value, setValue] = useState(String(row.stock));
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  const dirty = Number(value) !== row.stock;

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3">
      <Link
        href={`${root}/products/${row.productId}`}
        className="min-w-0 flex-1 text-sm text-ink hover:text-brand"
      >
        <span className="block truncate">
          {row.brand ? `${row.brand} · ` : ''}
          {row.productName}
        </span>
        <span className="block text-xs text-ink-muted">
          {row.colorName}
          {row.size !== 'ONE' ? ` · ${row.size}` : ''}
        </span>
      </Link>

      <input
        type="number"
        min={0}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        aria-label={`Остаток ${row.productName} ${row.colorName} ${row.size}`}
        className={cn(
          'price-figures h-9 w-20 rounded-lg border bg-white px-2 text-center text-sm focus:outline-none',
          dirty ? 'border-brand' : row.stock === 0 ? 'border-brand/40 text-brand' : 'border-line',
        )}
      />

      <Button
        size="sm"
        variant="outline"
        disabled={pending || !dirty}
        onClick={() =>
          start(async () => {
            const result = await updateStock(row.id, Number(value));
            if (result.ok) {
              setDone(true);
              setTimeout(() => setDone(false), 1500);
              router.refresh();
            }
          })
        }
      >
        {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
        {done ? <Check className="size-3.5 text-emerald-600" aria-hidden /> : 'Сохранить'}
      </Button>
    </li>
  );
}
