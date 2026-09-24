'use server';

import { redirect } from 'next/navigation';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { createSession, destroySession } from '@/lib/auth/session';
import { mergeGuestCart } from '@/lib/cart';
import { fieldErrors, loginSchema, registerSchema } from '@/lib/validation';

export type FormState = { errors?: Record<string, string>; ok?: boolean };

/** Where each role lands after signing in. */
function homeFor(role: Role): string {
  if (role === Role.ADMIN) return '/admin';
  if (role === Role.EMPLOYEE) return '/employee';
  return '/account';
}

/** Only allow internal paths, so ?next= cannot bounce anyone to another site. */
function safeNext(next: FormDataEntryValue | null): string | null {
  const value = typeof next === 'string' ? next : '';
  return value.startsWith('/') && !value.startsWith('//') ? value : null;
}

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    phone: formData.get('phone'),
    password: formData.get('password'),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const user = await prisma.user.findUnique({
    where: { phone: parsed.data.phone },
    select: {
      id: true,
      role: true,
      passwordHash: true,
      isActive: true,
      permissions: { select: { permission: true } },
    },
  });

  // one message for both cases: telling an attacker which half was wrong
  // turns the login form into a directory of registered numbers
  const wrong = { errors: { form: 'Неверный номер или пароль' } };
  if (!user?.passwordHash || !user.isActive) return wrong;

  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!valid) return wrong;

  await createSession({
    uid: user.id,
    role: user.role,
    perms: user.permissions.map((p) => p.permission),
  });
  await mergeGuestCart(user.id);

  redirect(safeNext(formData.get('next')) ?? homeFor(user.role));
}

export async function register(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse({
    name: formData.get('name'),
    phone: formData.get('phone'),
    password: formData.get('password'),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const existing = await prisma.user.findUnique({
    where: { phone: parsed.data.phone },
    select: { id: true },
  });
  if (existing) {
    return { errors: { phone: 'Этот номер уже зарегистрирован' } };
  }

  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      phone: parsed.data.phone,
      passwordHash: await bcrypt.hash(parsed.data.password, 10),
      role: Role.CUSTOMER,
    },
    select: { id: true, role: true },
  });

  await createSession({ uid: user.id, role: user.role, perms: [] });
  await mergeGuestCart(user.id);

  redirect(safeNext(formData.get('next')) ?? '/account');
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect('/');
}
