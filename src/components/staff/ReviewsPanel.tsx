'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { ReviewStatus } from '@prisma/client';
import { moderateReview } from '@/app/actions/staff';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type ReviewRow = {
  id: string;
  rating: number;
  text: string;
  status: ReviewStatus;
  createdAt: string;
  authorName: string;
  productName: string;
  productSlug: string;
};

const STATUS_LABELS: Record<ReviewStatus, string> = {
  PENDING: 'На модерации',
  APPROVED: 'Опубликован',
  REJECTED: 'Отклонён',
};

export function ReviewsPanel({ reviews }: { reviews: ReviewRow[] }) {
  if (reviews.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-line px-5 py-14 text-center">
        <p className="text-sm font-medium text-ink">Отзывов пока нет</p>
        {/* the rule is enforced in the data model, so this is not a placeholder */}
        <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">
          Отзыв на товар может оставить только покупатель, чей заказ с этой вещью уже выполнен.
          Как только такие заказы появятся, отзывы придут сюда на модерацию.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {reviews.map((review) => (
        <ReviewCard key={review.id} review={review} />
      ))}
    </ul>
  );
}

function ReviewCard({ review }: { review: ReviewRow }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function moderate(status: ReviewStatus) {
    start(async () => {
      await moderateReview(review.id, status);
      router.refresh();
    });
  }

  return (
    <li className="rounded-card border border-line bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href={`/product/${review.productSlug}`}
            className="text-sm font-medium text-ink hover:text-brand"
          >
            {review.productName}
          </Link>
          <p className="price-figures text-xs text-ink-faint">
            {review.authorName} · {review.rating} из 5 · {review.createdAt}
          </p>
        </div>

        <span
          className={cn(
            'rounded-full px-2.5 py-0.5 text-xs',
            review.status === ReviewStatus.APPROVED && 'bg-emerald-50 text-emerald-700',
            review.status === ReviewStatus.PENDING && 'bg-amber-50 text-amber-700',
            review.status === ReviewStatus.REJECTED && 'bg-surface-alt text-ink-faint',
          )}
        >
          {STATUS_LABELS[review.status]}
        </span>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-ink-muted">{review.text}</p>

      <div className="mt-4 flex gap-2">
        {review.status !== ReviewStatus.APPROVED ? (
          <Button size="sm" disabled={pending} onClick={() => moderate(ReviewStatus.APPROVED)}>
            {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
            Опубликовать
          </Button>
        ) : null}
        {review.status !== ReviewStatus.REJECTED ? (
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => moderate(ReviewStatus.REJECTED)}
          >
            Отклонить
          </Button>
        ) : null}
      </div>
    </li>
  );
}
