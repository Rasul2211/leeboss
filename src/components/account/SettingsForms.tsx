'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Check, Loader2 } from 'lucide-react';
import { changePassword, updateProfile, type FieldResult } from '@/app/actions/account';
import { Field, FormError, Input } from '@/components/ui/field';
import { Button } from '@/components/ui/button';

const EMPTY: FieldResult = {};

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
      {label}
    </Button>
  );
}

function Saved({ shown }: { shown?: boolean }) {
  if (!shown) return null;
  return (
    <span className="inline-flex items-center gap-1 text-sm text-emerald-600">
      <Check className="size-4" aria-hidden />
      Сохранено
    </span>
  );
}

export function ProfileForm({ defaults }: { defaults: { name: string; phone: string } }) {
  const [state, action] = useActionState(updateProfile, EMPTY);
  const errors = state.errors ?? {};

  return (
    <form action={action} className="space-y-4">
      <FormError message={errors.form} />

      <Field id="name" label="Имя" error={errors.name}>
        <Input id="name" name="name" defaultValue={defaults.name} invalid={Boolean(errors.name)} required />
      </Field>

      <Field
        id="phone"
        label="Телефон"
        hint="Он же используется для входа"
        error={errors.phone}
      >
        <Input
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          defaultValue={defaults.phone}
          invalid={Boolean(errors.phone)}
          required
        />
      </Field>

      <div className="flex items-center gap-3">
        <Submit label="Сохранить" />
        <Saved shown={state.ok} />
      </div>
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState(changePassword, EMPTY);
  const errors = state.errors ?? {};

  return (
    <form action={action} className="space-y-4">
      <FormError message={errors.form} />

      <Field id="current" label="Текущий пароль" error={errors.current}>
        <Input
          id="current"
          name="current"
          type="password"
          autoComplete="current-password"
          invalid={Boolean(errors.current)}
          required
        />
      </Field>

      <Field id="next" label="Новый пароль" hint="Не короче 6 символов" error={errors.next}>
        <Input
          id="next"
          name="next"
          type="password"
          autoComplete="new-password"
          invalid={Boolean(errors.next)}
          required
        />
      </Field>

      <Field id="repeat" label="Повторите новый пароль" error={errors.repeat}>
        <Input
          id="repeat"
          name="repeat"
          type="password"
          autoComplete="new-password"
          invalid={Boolean(errors.repeat)}
          required
        />
      </Field>

      <div className="flex items-center gap-3">
        <Submit label="Сменить пароль" />
        <Saved shown={state.ok} />
      </div>
    </form>
  );
}
