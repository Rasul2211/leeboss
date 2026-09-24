'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { login, register, type FormState } from '@/app/actions/auth';
import { Field, FormError, Input } from '@/components/ui/field';
import { Button } from '@/components/ui/button';

const EMPTY: FormState = {};

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
      {label}
    </Button>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(login, EMPTY);
  const errors = state.errors ?? {};

  return (
    <form action={action} className="space-y-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <FormError message={errors.form} />

      <Field id="phone" label="Номер телефона" error={errors.phone}>
        <Input
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="+992 90 000 00 00"
          invalid={Boolean(errors.phone)}
          required
        />
      </Field>

      <Field id="password" label="Пароль" error={errors.password}>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          invalid={Boolean(errors.password)}
          required
        />
      </Field>

      <Submit label="Войти" />

      <p className="text-center text-sm text-ink-muted">
        Нет аккаунта?{' '}
        <Link href="/register" className="font-medium text-brand hover:text-brand-hover">
          Зарегистрироваться
        </Link>
      </p>
    </form>
  );
}

export function RegisterForm({ next }: { next?: string }) {
  const [state, action] = useActionState(register, EMPTY);
  const errors = state.errors ?? {};

  return (
    <form action={action} className="space-y-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <FormError message={errors.form} />

      <Field id="name" label="Имя" error={errors.name}>
        <Input
          id="name"
          name="name"
          autoComplete="name"
          placeholder="Как к вам обращаться"
          invalid={Boolean(errors.name)}
          required
        />
      </Field>

      <Field id="phone" label="Номер телефона" error={errors.phone}>
        <Input
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="+992 90 000 00 00"
          invalid={Boolean(errors.phone)}
          required
        />
      </Field>

      <Field id="password" label="Пароль" hint="Не короче 6 символов" error={errors.password}>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          invalid={Boolean(errors.password)}
          required
        />
      </Field>

      <Submit label="Создать аккаунт" />

      <p className="text-center text-sm text-ink-muted">
        Уже есть аккаунт?{' '}
        <Link href="/login" className="font-medium text-brand hover:text-brand-hover">
          Войти
        </Link>
      </p>
    </form>
  );
}
