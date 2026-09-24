'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, MapPin, Plus, Trash2 } from 'lucide-react';
import { deleteAddress, saveAddress } from '@/app/actions/account';
import { Field, Input } from '@/components/ui/field';
import { Button } from '@/components/ui/button';

export type AddressRow = {
  id: string;
  label: string | null;
  city: string;
  street: string;
  flat: string | null;
  comment: string | null;
  isDefault: boolean;
};

const BLANK = {
  id: undefined as string | undefined,
  label: '',
  city: 'Душанбе',
  street: '',
  flat: '',
  comment: '',
  isDefault: false,
};

export function AddressBook({ addresses }: { addresses: AddressRow[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<typeof BLANK | null>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function save() {
    if (!editing) return;
    setError(null);
    start(async () => {
      const result = await saveAddress(editing);
      if (result.ok) {
        setEditing(null);
        router.refresh();
      } else {
        setError(result.message);
      }
    });
  }

  return (
    <div className="space-y-4">
      {addresses.length === 0 && !editing ? (
        <div className="rounded-card border border-dashed border-line px-5 py-16 text-center">
          <MapPin className="mx-auto size-8 text-ink-faint" aria-hidden />
          <p className="mt-4 text-sm font-medium text-ink">Адресов пока нет</p>
          <p className="mt-1 text-sm text-ink-muted">
            Сохранённый адрес подставится при оформлении заказа.
          </p>
        </div>
      ) : null}

      <ul className="space-y-3">
        {addresses.map((address) => (
          <li key={address.id} className="rounded-card border border-line px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-ink">
                  {address.label || address.city}
                  {address.isDefault ? (
                    <span className="ml-2 rounded-full bg-brand-soft px-2 py-0.5 text-[11px] text-brand">
                      основной
                    </span>
                  ) : null}
                </p>
                <p className="text-sm text-ink-muted">
                  {address.city}, {address.street}
                  {address.flat ? `, кв. ${address.flat}` : ''}
                </p>
                {address.comment ? (
                  <p className="text-xs text-ink-faint">{address.comment}</p>
                ) : null}
              </div>

              <div className="flex shrink-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setEditing({
                      id: address.id,
                      label: address.label ?? '',
                      city: address.city,
                      street: address.street,
                      flat: address.flat ?? '',
                      comment: address.comment ?? '',
                      isDefault: address.isDefault,
                    })
                  }
                  className="text-xs text-ink-muted hover:text-brand"
                >
                  Изменить
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      await deleteAddress(address.id);
                      router.refresh();
                    })
                  }
                  aria-label="Удалить адрес"
                  className="text-ink-faint hover:text-brand disabled:opacity-50"
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {editing ? (
        <div className="rounded-card border border-line p-5">
          <h2 className="text-sm font-semibold text-ink">
            {editing.id ? 'Изменить адрес' : 'Новый адрес'}
          </h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field id="label" label="Название" hint="Например, дом или работа">
              <Input
                id="label"
                value={editing.label}
                onChange={(event) => setEditing({ ...editing, label: event.target.value })}
              />
            </Field>
            <Field id="city" label="Город">
              <Input
                id="city"
                value={editing.city}
                onChange={(event) => setEditing({ ...editing, city: event.target.value })}
              />
            </Field>
            <Field id="street" label="Улица и дом">
              <Input
                id="street"
                value={editing.street}
                onChange={(event) => setEditing({ ...editing, street: event.target.value })}
              />
            </Field>
            <Field id="flat" label="Квартира">
              <Input
                id="flat"
                value={editing.flat}
                onChange={(event) => setEditing({ ...editing, flat: event.target.value })}
              />
            </Field>
          </div>

          <Field id="comment" label="Комментарий курьеру">
            <Input
              id="comment"
              value={editing.comment}
              onChange={(event) => setEditing({ ...editing, comment: event.target.value })}
            />
          </Field>

          <label className="mt-4 flex items-center gap-2.5 text-sm text-ink">
            <input
              type="checkbox"
              checked={editing.isDefault}
              onChange={(event) => setEditing({ ...editing, isDefault: event.target.checked })}
              className="size-4 accent-[var(--color-brand)]"
            />
            Использовать по умолчанию
          </label>

          <div className="mt-5 flex items-center gap-3">
            <Button onClick={save} disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              Сохранить
            </Button>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="text-sm text-ink-muted hover:text-ink"
            >
              Отмена
            </button>
          </div>

          {error ? (
            <p role="alert" className="mt-3 text-sm text-brand">
              {error}
            </p>
          ) : null}
        </div>
      ) : (
        <Button variant="outline" onClick={() => setEditing({ ...BLANK })}>
          <Plus className="size-4" aria-hidden />
          Добавить адрес
        </Button>
      )}
    </div>
  );
}
