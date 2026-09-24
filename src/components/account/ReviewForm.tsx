'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Star } from 'lucide-react';
import { submitReview } from '@/app/actions/account';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/field';
import { cn } from '@/lib/utils';

export function ReviewForm({
  orderId,
  productId,
  productName,
}: {
  orderId: string;
  productId: string;
  productName: string;
}) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 text-xs font-medium text-brand hover:text-brand-hover"
      >
        Оставить отзыв
      </button>
    );
  }

  function send() {
    setError(null);
    start(async () => {
      const result = await submitReview({ orderId, productId, rating, text });
      if (result.ok) {
        setOpen(false);
        router.refresh();
      } else {
        setError(result.message);
      }
    });
  }

  return (
    <div className="mt-3 rounded-lg border border-line p-3">
      <p className="text-xs text-ink-muted">Отзыв на «{productName}»</p>

      <div className="mt-2 flex gap-1" role="radiogroup" aria-label="Оценка">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={value === rating}
            aria-label={`${value} из 5`}
            onClick={() => setRating(value)}
          >
            <Star
              className={cn(
                'size-5 transition-colors',
                value <= rating ? 'fill-brand text-brand' : 'text-line',
              )}
            />
          </button>
        ))}
      </div>

      <Textarea
        rows={3}
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Как вещь села, что понравилось"
        aria-label="Текст отзыва"
        className="mt-2 text-sm"
      />

      <div className="mt-2 flex items-center gap-2">
        <Button size="sm" onClick={send} disabled={pending}>
          {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
          Отправить
        </Button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-ink-faint hover:text-ink"
        >
          Отмена
        </button>
      </div>

      {error ? (
        <p role="alert" className="mt-2 text-xs text-brand">
          {error}
        </p>
      ) : null}

      <p className="mt-2 text-[11px] text-ink-faint">
        Отзыв появится на сайте после проверки модератором.
      </p>
    </div>
  );
}
