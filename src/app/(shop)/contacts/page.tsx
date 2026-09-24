import type { Metadata } from 'next';
import Link from 'next/link';
import { Clock, MapPin, Send } from 'lucide-react';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = {
  title: 'Контакты и адреса',
  description:
    'Магазины LEEBOSS в Душанбе: ТЦ Муниса, 2 этаж, и ТЦ Сиёма Молл, 1 этаж. Часы работы и связь в Telegram.',
};

export default async function ContactsPage() {
  const points = await prisma.pickupPoint.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
        Контакты и адреса
      </h1>
      <p className="mt-2 max-w-xl text-sm text-ink-muted">
        Два зала в Душанбе. В любом можно примерить вживую и забрать заказ, оформленный на сайте.
      </p>

      <ul className="mt-8 grid gap-4 sm:grid-cols-2">
        {points.map((point) => (
          <li key={point.id} className="rounded-card border border-line p-6">
            <h2 className="text-base font-semibold text-ink">{point.name}</h2>

            <p className="mt-3 flex items-start gap-2.5 text-sm text-ink-muted">
              <MapPin className="mt-0.5 size-4 shrink-0 text-ink-faint" aria-hidden />
              {point.address}
            </p>

            <p className="mt-2 flex items-start gap-2.5 text-sm text-ink-muted">
              <Clock className="mt-0.5 size-4 shrink-0 text-ink-faint" aria-hidden />
              Ежедневно {point.hoursFrom}–{point.hoursTo}
            </p>
          </li>
        ))}
      </ul>

      <section className="mt-8 rounded-card bg-surface-alt p-6">
        <h2 className="text-base font-semibold text-ink">Связаться с нами</h2>
        <p className="mt-2 text-sm text-ink-muted">
          Быстрее всего ответим в Telegram — подскажем размер, наличие и статус заказа.
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href="https://t.me/leebosstj"
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-brand px-5 text-sm font-medium text-white transition-colors hover:bg-brand-hover"
          >
            <Send className="size-4" aria-hidden />
            Telegram
          </a>
          <a
            href="https://instagram.com/leeboss_tj"
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex h-11 items-center gap-2 rounded-lg border border-line bg-white px-5 text-sm font-medium text-ink transition-colors hover:border-ink/30"
          >
            Instagram
          </a>
        </div>
      </section>

      <p className="mt-8 text-sm text-ink-muted">
        Не нашли нужное?{' '}
        <Link href="/catalog" className="font-medium text-brand hover:text-brand-hover">
          Посмотрите каталог
        </Link>{' '}
        или{' '}
        <Link href="/fitting" className="font-medium text-brand hover:text-brand-hover">
          примерьте на манекене
        </Link>
        .
      </p>
    </div>
  );
}
