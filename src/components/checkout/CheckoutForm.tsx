'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Banknote, CreditCard, Loader2, Store, Truck } from 'lucide-react';
import { createOrder, type CheckoutState } from '@/app/actions/order';
import { Field, FormError, Input, Textarea } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { formatPrice } from '@/lib/money';
import { cn } from '@/lib/utils';

type Zone = {
  id: string;
  city: string;
  cost: number;
  freeThreshold: number | null;
  daysMin: number;
  daysMax: number;
};
type Point = { id: string; name: string; address: string; hoursFrom: string; hoursTo: string };
type Method = 'PICKUP' | 'COURIER_DUSHANBE' | 'REGIONAL';

type Props = {
  subtotal: number;
  zones: Zone[];
  dushanbe: Zone | null;
  regional: Zone[];
  points: Point[];
  defaults: { name: string; phone: string };
};

const EMPTY: CheckoutState = {};

export function CheckoutForm({ subtotal, dushanbe, regional, points, defaults }: Props) {
  const [state, action] = useActionState(createOrder, EMPTY);
  const [method, setMethod] = useState<Method>('PICKUP');
  const [pointId, setPointId] = useState(points[0]?.id ?? '');
  const [zoneId, setZoneId] = useState(regional[0]?.id ?? '');
  const errors = state.errors ?? {};

  const activeZone = method === 'COURIER_DUSHANBE' ? dushanbe : regional.find((z) => z.id === zoneId);
  const shipping =
    method === 'PICKUP'
      ? 0
      : activeZone
        ? activeZone.freeThreshold != null && subtotal >= activeZone.freeThreshold
          ? 0
          : activeZone.cost
        : 0;

  return (
    <form action={action} className="grid gap-10 lg:grid-cols-[1fr_20rem]">
      <div className="space-y-8">
        <FormError message={errors.form} />

        <section>
          <h2 className="text-base font-semibold text-ink">Контакты</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field id="name" label="Имя" error={errors.name}>
              <Input id="name" name="name" defaultValue={defaults.name} invalid={Boolean(errors.name)} required />
            </Field>
            <Field id="phone" label="Телефон" error={errors.phone}>
              <Input
                id="phone"
                name="phone"
                type="tel"
                inputMode="tel"
                placeholder="+992 90 000 00 00"
                defaultValue={defaults.phone}
                invalid={Boolean(errors.phone)}
                required
              />
            </Field>
          </div>
        </section>

        <section>
          <h2 className="text-base font-semibold text-ink">Доставка</h2>
          <input type="hidden" name="deliveryMethod" value={method} />

          <div className="mt-4 space-y-2">
            <Option
              active={method === 'PICKUP'}
              onSelect={() => setMethod('PICKUP')}
              icon={Store}
              title="Самовывоз из магазина"
              note="Бесплатно, в день заказа"
              price={0}
            />
            {dushanbe ? (
              <Option
                active={method === 'COURIER_DUSHANBE'}
                onSelect={() => setMethod('COURIER_DUSHANBE')}
                icon={Truck}
                title="Курьер по Душанбе"
                note={
                  dushanbe.freeThreshold != null && subtotal >= dushanbe.freeThreshold
                    ? `Бесплатно, ${dushanbe.daysMin}–${dushanbe.daysMax} дня`
                    : `${dushanbe.daysMin}–${dushanbe.daysMax} дня${
                        dushanbe.freeThreshold != null
                          ? `, бесплатно от ${dushanbe.freeThreshold} сомони`
                          : ''
                      }`
                }
                price={
                  dushanbe.freeThreshold != null && subtotal >= dushanbe.freeThreshold ? 0 : dushanbe.cost
                }
              />
            ) : null}
            {regional.length ? (
              <Option
                active={method === 'REGIONAL'}
                onSelect={() => setMethod('REGIONAL')}
                icon={Truck}
                title="Доставка по регионам"
                note="Худжанд, Бохтар, Куляб, Истаравшан, Хорог"
                price={regional[0]?.cost ?? 0}
              />
            ) : null}
          </div>

          {method === 'PICKUP' ? (
            <div className="mt-4">
              <input type="hidden" name="pickupPointId" value={pointId} />
              <fieldset>
                <legend className="text-sm font-medium text-ink">Куда приехать</legend>
                <div className="mt-2 space-y-2">
                  {points.map((point) => (
                    <button
                      key={point.id}
                      type="button"
                      onClick={() => setPointId(point.id)}
                      aria-pressed={point.id === pointId}
                      className={cn(
                        'block w-full rounded-lg border px-4 py-3 text-left transition-colors',
                        point.id === pointId ? 'border-brand bg-brand-soft' : 'border-line hover:border-ink/30',
                      )}
                    >
                      <span className="block text-sm font-medium text-ink">{point.name}</span>
                      <span className="block text-xs text-ink-muted">{point.address}</span>
                      <span className="block text-xs text-ink-faint">
                        {point.hoursFrom}–{point.hoursTo}
                      </span>
                    </button>
                  ))}
                </div>
                {errors.pickupPointId ? (
                  <p role="alert" className="mt-1.5 text-xs text-brand">
                    {errors.pickupPointId}
                  </p>
                ) : null}
              </fieldset>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {method === 'REGIONAL' ? (
                <Field id="deliveryZoneId" label="Город" error={errors.deliveryZoneId}>
                  <select
                    id="deliveryZoneId"
                    name="deliveryZoneId"
                    value={zoneId}
                    onChange={(event) => setZoneId(event.target.value)}
                    className="h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink focus:border-brand focus:outline-none"
                  >
                    {regional.map((zone) => (
                      <option key={zone.id} value={zone.id}>
                        {zone.city} — {zone.cost} сомони, {zone.daysMin}–{zone.daysMax} дней
                      </option>
                    ))}
                  </select>
                </Field>
              ) : (
                <input type="hidden" name="deliveryZoneId" value={dushanbe?.id ?? ''} />
              )}

              <Field id="address" label="Адрес" error={errors.address}>
                <Input
                  id="address"
                  name="address"
                  placeholder="Улица, дом, квартира"
                  invalid={Boolean(errors.address)}
                />
              </Field>
            </div>
          )}
        </section>

        <section>
          <h2 className="text-base font-semibold text-ink">Оплата</h2>
          <div className="mt-4 space-y-2">
            <label
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3',
                'has-[:checked]:border-brand has-[:checked]:bg-brand-soft',
                'border-line',
              )}
            >
              <input
                type="radio"
                name="paymentMethod"
                value="CASH_ON_DELIVERY"
                defaultChecked
                className="mt-1 accent-[var(--color-brand)]"
              />
              <span>
                <span className="flex items-center gap-2 text-sm font-medium text-ink">
                  <Banknote className="size-4" aria-hidden />
                  При получении
                </span>
                <span className="mt-0.5 block text-xs text-ink-muted">
                  Наличными или картой в магазине либо курьеру
                </span>
              </span>
            </label>

            <label
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3',
                'has-[:checked]:border-brand has-[:checked]:bg-brand-soft',
                'border-line',
              )}
            >
              <input type="radio" name="paymentMethod" value="CARD_DEMO" className="mt-1 accent-[var(--color-brand)]" />
              <span>
                <span className="flex items-center gap-2 text-sm font-medium text-ink">
                  <CreditCard className="size-4" aria-hidden />
                  Картой онлайн
                </span>
                {/* stated outright: this build moves no money */}
                <span className="mt-0.5 block text-xs text-ink-muted">
                  Демонстрационный режим — реальное списание не производится
                </span>
              </span>
            </label>
          </div>
        </section>

        <section>
          <Field id="comment" label="Комментарий" hint="Необязательно">
            <Textarea id="comment" name="comment" rows={3} placeholder="Например, позвонить за час" />
          </Field>
        </section>
      </div>

      <aside className="lg:sticky lg:top-28 lg:self-start">
        <div className="rounded-card border border-line p-6">
          <h2 className="text-base font-semibold text-ink">Ваш заказ</h2>

          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-muted">Товары</dt>
              <dd className="price-figures text-ink">{formatPrice(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-muted">Доставка</dt>
              <dd className="price-figures text-ink">
                {shipping === 0 ? 'бесплатно' : formatPrice(shipping)}
              </dd>
            </div>
          </dl>

          <div className="mt-4 flex items-baseline justify-between border-t border-line pt-4">
            <span className="text-sm font-medium text-ink">Итого</span>
            <span className="price-figures text-xl font-semibold text-brand">
              {formatPrice(subtotal + shipping)}
            </span>
          </div>

          <Submit />

          <p className="mt-3 text-xs leading-relaxed text-ink-faint">
            Нажимая кнопку, вы соглашаетесь, что с вами свяжутся для подтверждения заказа.
          </p>
        </div>
      </aside>
    </form>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="mt-6 w-full" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
      Оформить заказ
    </Button>
  );
}

function Option({
  active,
  onSelect,
  icon: Icon,
  title,
  note,
  price,
}: {
  active: boolean;
  onSelect: () => void;
  icon: typeof Store;
  title: string;
  note: string;
  price: number;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={cn(
        'flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-left transition-colors',
        active ? 'border-brand bg-brand-soft' : 'border-line hover:border-ink/30',
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0 text-ink-muted" aria-hidden />
      <span className="flex-1">
        <span className="block text-sm font-medium text-ink">{title}</span>
        <span className="block text-xs text-ink-muted">{note}</span>
      </span>
      <span className="price-figures shrink-0 text-sm text-ink">
        {price === 0 ? 'бесплатно' : formatPrice(price)}
      </span>
    </button>
  );
}
