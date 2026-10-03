import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'О магазине',
  description:
    'LEEBOSS — магазин мужской одежды в Душанбе: два зала, готовые образы и доставка по Таджикистану.',
};

export default async function AboutPage() {
  // figures come from the catalogue itself, so the page cannot overstate the range
  const [products, points, categories] = await Promise.all([
    prisma.product.count({ where: { isActive: true } }),
    prisma.pickupPoint.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
    prisma.category.count({ where: { isActive: true, parentId: { not: null } } }),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">О магазине</h1>

      <p className="mt-4 text-base leading-relaxed text-ink-muted">
        LEEBOSS — магазин мужской одежды в Душанбе. Мы собираем повседневный гардероб: футболки и
        тениски, брюки и джинсы, кроссовки, кепки и шапки. В двух залах можно всё померить руками,
        а на сайте — собрать из этих вещей образ и забрать его целиком.
      </p>

      <div className="relative mt-8 aspect-16/9 overflow-hidden rounded-card bg-surface-alt">
        <Image
          src="/products/teniska-korichnevaya.jpg"
          alt="Мужская тениска LEEBOSS"
          fill
          sizes="(min-width: 768px) 768px, 100vw"
          className="object-cover"
          priority
        />
      </div>

      <dl className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat value={String(points.length)} label="зала в Душанбе" />
        <Stat value={String(products)} label="позиций в каталоге" />
        <Stat value={String(categories)} label="категорий" />
        <Stat value="26 600" label="подписчиков в Instagram" />
      </dl>

      <section className="mt-10">
        <h2 className="text-base font-semibold text-ink">Образ целиком, а не вещь по одной</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          Вещь редко покупают саму по себе: к брюкам нужен верх, к верху — обувь. Поэтому в залах мы
          собираем и снимаем готовые образы, а на сайте можно собрать свой: листаете верх, низ и
          обувь, пока они не сойдутся, и берёте всё одной кнопкой.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-base font-semibold text-ink">Где нас найти</h2>
        <ul className="mt-3 space-y-2">
          {points.map((point) => (
            <li key={point.id} className="text-sm text-ink-muted">
              <span className="font-medium text-ink">{point.name}</span> — {point.address}
              <span className="text-ink-faint">
                {' · '}
                {point.hoursFrom}–{point.hoursTo}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-10 flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/fitting">Собрать образ</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/contacts">Контакты</Link>
        </Button>
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    // value first visually, label under it, but each said once
    <div className="flex flex-col-reverse rounded-card border border-line px-4 py-4">
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="price-figures text-xl font-semibold text-ink">{value}</dd>
    </div>
  );
}
