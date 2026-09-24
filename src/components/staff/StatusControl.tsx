'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import type { OrderStatus } from '@prisma/client';
import { setOrderStatus } from '@/app/actions/staff';
import { ORDER_STATUS_LABELS } from '@/lib/orders';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/field';
import { cn } from '@/lib/utils';

export function StatusControl({
  orderId,
  options,
}: {
  orderId: string;
  options: OrderStatus[];
}) {
  const [status, setStatus] = useState<OrderStatus | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function apply() {
    if (!status) return;
    setError(null);
    startTransition(async () => {
      const result = await setOrderStatus({ orderId, status, note: note.trim() || undefined });
      if (result.ok) {
        setStatus(null);
        setNote('');
        router.refresh();
      } else {
        setError(result.message);
      }
    });
  }

  return (
    <div className="mt-3 space-y-3">
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setStatus(option === status ? null : option)}
            aria-pressed={option === status}
            className={cn(
              'h-9 rounded-lg border px-3 text-sm transition-colors',
              option === status
                ? 'border-brand bg-brand text-white'
                : 'border-line text-ink hover:border-ink/40',
            )}
          >
            {ORDER_STATUS_LABELS[option]}
          </button>
        ))}
      </div>

      {status ? (
        <>
          <Textarea
            rows={2}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Комментарий к изменению (необязательно)"
            aria-label="Комментарий к изменению статуса"
          />
          <Button onClick={apply} disabled={pending} className="w-full">
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            Перевести в «{ORDER_STATUS_LABELS[status]}»
          </Button>
        </>
      ) : null}

      {error ? (
        <p role="alert" className="text-xs text-brand">
          {error}
        </p>
      ) : null}
    </div>
  );
}
