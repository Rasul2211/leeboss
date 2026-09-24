import type { Metadata } from 'next';
import { Banknote, CreditCard, Store, Truck } from 'lucide-react';
import { getDeliveryOptions } from '@/lib/delivery';
import { formatPrice } from '@/lib/money';

export const metadata: Metadata = {
  title: 'Доставка и оплата',
  description:
    'Самовывоз из магазинов LEEBOSS в Душанбе бесплатно, курьер по городу и доставка по регионам Таджикистана. Оплата при получении.',
};

export default async function DeliveryPage() {
  // the same rows the checkout prices against, so this page cannot drift from reality
  const { points, dushanbe, regional } = await getDeliveryOptions();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
        Доставка и оплата
      </h1>

      <section className="mt-8">
        <h2 className="text-base font-semibold text-ink">Как получить заказ</h2>

        <ul className="mt-4 space-y-3">
          <li className="rounded-card border border-line p-5">
            <div className="flex items-start gap-3">
              <Store className="mt-0.5 size-5 shrink-0 text-ink-faint" aria-hidden />
              <div className="flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-sm font-medium text-ink">Самовывоз</h3>
                  <span className="text-sm font-medium text-ink">бесплатно</span>
                </div>
                <p className="mt-1 text-sm text-ink-muted">
                  Забрать можно в день заказа в любом из залов:
                </p>
                <ul className="mt-2 space-y-1">
                  {points.map((point) => (
                    <li key={point.id} className="text-sm text-ink-muted">
                      <span className="text-ink">{point.name}</span>, {point.address}
                      <span className="text-ink-faint">
                        {' · '}
                        {point.hoursFrom}–{point.hoursTo}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </li>

          {dushanbe ? (
            <li className="rounded-card border border-line p-5">
              <div className="flex items-start gap-3">
                <Truck className="mt-0.5 size-5 shrink-0 text-ink-faint" aria-hidden />
                <div className="flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-sm font-medium text-ink">Курьер по Душанбе</h3>
                    <span className="price-figures text-sm font-medium text-ink">
                      {formatPrice(dushanbe.cost)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-ink-muted">
                    {dushanbe.daysMin}–{dushanbe.daysMax} дня
                    {dushanbe.freeThreshold != null
                      ? `. Бесплатно при заказе от ${formatPrice(dushanbe.freeThreshold)}.`
                      : '.'}
                  </p>
                </div>
              </div>
            </li>
          ) : null}

          {regional.length > 0 ? (
            <li className="rounded-card border border-line p-5">
              <div className="flex items-start gap-3">
                <Truck className="mt-0.5 size-5 shrink-0 text-ink-faint" aria-hidden />
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-ink">Доставка по регионам</h3>
                  <ul className="mt-2 divide-y divide-line">
                    {regional.map((zone) => (
                      <li key={zone.id} className="flex justify-between gap-3 py-1.5 text-sm">
                        <span className="text-ink-muted">{zone.city}</span>
                        <span className="price-figures text-ink">
                          {formatPrice(zone.cost)}
                          <span className="text-ink-faint">
                            {' · '}
                            {zone.daysMin}–{zone.daysMax} дней
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </li>
          ) : null}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-base font-semibold text-ink">Оплата</h2>

        <ul className="mt-4 space-y-3">
          <li className="flex items-start gap-3 rounded-card border border-line p-5">
            <Banknote className="mt-0.5 size-5 shrink-0 text-ink-faint" aria-hidden />
            <div>
              <h3 className="text-sm font-medium text-ink">При получении</h3>
              <p className="mt-1 text-sm text-ink-muted">
                Наличными или картой — в магазине при самовывозе либо курьеру.
              </p>
            </div>
          </li>

          <li className="flex items-start gap-3 rounded-card border border-line p-5">
            <CreditCard className="mt-0.5 size-5 shrink-0 text-ink-faint" aria-hidden />
            <div>
              <h3 className="text-sm font-medium text-ink">Картой онлайн</h3>
              {/* said plainly here as well as at checkout */}
              <p className="mt-1 text-sm text-ink-muted">
                Работает в демонстрационном режиме: заказ помечается оплаченным, но реального
                списания не происходит. Подключение платёжной системы Таджикистана требует договора
                с банком.
              </p>
            </div>
          </li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-base font-semibold text-ink">Обмен и возврат</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          Если вещь не подошла по размеру, напишите нам в Telegram — договоримся об обмене в
          магазине. Виртуальная примерка помогает выбрать размер заранее, но окончательное решение
          всегда за вами, и мы это понимаем.
        </p>
      </section>
    </div>
  );
}
