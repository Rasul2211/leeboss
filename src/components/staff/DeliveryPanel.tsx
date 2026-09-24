'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2 } from 'lucide-react';
import { updateDeliveryZone } from '@/app/actions/staff';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/field';

export type ZoneRow = {
  id: string;
  city: string;
  cost: number;
  freeThreshold: number | null;
  daysMin: number;
  daysMax: number;
  isActive: boolean;
};

export type PointRow = {
  id: string;
  name: string;
  address: string;
  hoursFrom: string;
  hoursTo: string;
};

export function DeliveryPanel({ zones, points }: { zones: ZoneRow[]; points: PointRow[] }) {
  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-sm font-semibold text-ink">Зоны доставки</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Стоимость считается на сервере по этим правилам — цену доставки нельзя подменить со
          стороны браузера.
        </p>
        <div className="mt-4 space-y-3">
          {zones.map((zone) => (
            <ZoneCard key={zone.id} zone={zone} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-ink">Точки самовывоза</h2>
        <ul className="mt-4 space-y-2">
          {points.map((point) => (
            <li key={point.id} className="rounded-card border border-line bg-white px-5 py-4">
              <p className="text-sm font-medium text-ink">{point.name}</p>
              <p className="text-sm text-ink-muted">{point.address}</p>
              <p className="price-figures text-xs text-ink-faint">
                {point.hoursFrom}–{point.hoursTo}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function ZoneCard({ zone }: { zone: ZoneRow }) {
  const router = useRouter();
  const [form, setForm] = useState({
    cost: String(zone.cost),
    freeThreshold: zone.freeThreshold == null ? '' : String(zone.freeThreshold),
    daysMin: String(zone.daysMin),
    daysMax: String(zone.daysMax),
    isActive: zone.isActive,
  });
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function save() {
    setError(null);
    start(async () => {
      const result = await updateDeliveryZone({
        zoneId: zone.id,
        cost: Number(form.cost),
        freeThreshold: form.freeThreshold.trim() === '' ? null : Number(form.freeThreshold),
        daysMin: Number(form.daysMin),
        daysMax: Number(form.daysMax),
        isActive: form.isActive,
      });
      if (result.ok) {
        setDone(true);
        setTimeout(() => setDone(false), 1800);
        router.refresh();
      } else {
        setError(result.message);
      }
    });
  }

  return (
    <div className="rounded-card border border-line bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-ink">{zone.city}</h3>
        <label className="inline-flex items-center gap-2 text-xs text-ink-muted">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
            className="size-4 accent-[var(--color-brand)]"
          />
          Доступна
        </label>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-4">
        <NumberField
          label="Цена, сомони"
          value={form.cost}
          onChange={(cost) => setForm({ ...form, cost })}
        />
        <NumberField
          label="Бесплатно от"
          value={form.freeThreshold}
          placeholder="нет"
          onChange={(freeThreshold) => setForm({ ...form, freeThreshold })}
        />
        <NumberField
          label="Срок от, дней"
          value={form.daysMin}
          onChange={(daysMin) => setForm({ ...form, daysMin })}
        />
        <NumberField
          label="Срок до, дней"
          value={form.daysMax}
          onChange={(daysMax) => setForm({ ...form, daysMax })}
        />
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Button size="sm" onClick={save} disabled={pending}>
          {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
          Сохранить
        </Button>
        {done ? (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
            <Check className="size-3.5" aria-hidden />
            Сохранено
          </span>
        ) : null}
        {error ? (
          <span role="alert" className="text-xs text-brand">
            {error}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="block text-xs text-ink-faint">{label}</span>
      <Input
        type="number"
        min={0}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-9 price-figures"
      />
    </label>
  );
}
