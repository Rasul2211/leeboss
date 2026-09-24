'use server';

import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';
import { OrderStatus, ReviewStatus } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { fieldErrors, nameSchema, passwordSchema, phoneSchema } from '@/lib/validation';

export type Result = { ok: true } | { ok: false; message: string };
export type FieldResult = { ok?: boolean; errors?: Record<string, string> };

// ---------------------------------------------------------------- profile

const profileSchema = z.object({ name: nameSchema, phone: phoneSchema });

export async function updateProfile(_prev: FieldResult, formData: FormData): Promise<FieldResult> {
  const user = await getCurrentUser();
  if (!user) return { errors: { form: 'Нужно войти' } };

  const parsed = profileSchema.safeParse({
    name: formData.get('name'),
    phone: formData.get('phone'),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  if (parsed.data.phone !== user.phone) {
    const taken = await prisma.user.findUnique({
      where: { phone: parsed.data.phone },
      select: { id: true },
    });
    if (taken) return { errors: { phone: 'Этот номер уже занят' } };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { name: parsed.data.name, phone: parsed.data.phone },
  });

  revalidatePath('/account', 'layout');
  return { ok: true };
}

const passwordChangeSchema = z
  .object({
    current: z.string().min(1, 'Введите текущий пароль'),
    next: passwordSchema,
    repeat: z.string(),
  })
  .refine((value) => value.next === value.repeat, {
    path: ['repeat'],
    message: 'Пароли не совпадают',
  });

export async function changePassword(_prev: FieldResult, formData: FormData): Promise<FieldResult> {
  const user = await getCurrentUser();
  if (!user) return { errors: { form: 'Нужно войти' } };

  const parsed = passwordChangeSchema.safeParse({
    current: formData.get('current'),
    next: formData.get('next'),
    repeat: formData.get('repeat'),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const row = await prisma.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true },
  });
  // the current password is checked even though the session is already trusted:
  // it stops someone who walked up to an unlocked screen from taking the account
  if (!row?.passwordHash || !(await bcrypt.compare(parsed.data.current, row.passwordHash))) {
    return { errors: { current: 'Текущий пароль неверен' } };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(parsed.data.next, 10) },
  });

  return { ok: true };
}

// ---------------------------------------------------------------- addresses

const addressSchema = z.object({
  id: z.string().optional(),
  label: z.string().trim().max(40).optional(),
  city: z.string().trim().min(2, 'Укажите город').max(60),
  street: z.string().trim().min(3, 'Укажите улицу и дом').max(160),
  flat: z.string().trim().max(30).optional(),
  comment: z.string().trim().max(200).optional(),
  isDefault: z.boolean().optional(),
});

export async function saveAddress(input: z.infer<typeof addressSchema>): Promise<Result> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: 'Нужно войти' };

  const parsed = addressSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'Проверьте адрес' };
  }

  const { id, isDefault, ...data } = parsed.data;
  const payload = {
    label: data.label || null,
    city: data.city,
    street: data.street,
    flat: data.flat || null,
    comment: data.comment || null,
    isDefault: Boolean(isDefault),
  };

  await prisma.$transaction(async (tx) => {
    // only one address may be the default, so clear the flag before setting it
    if (payload.isDefault) {
      await tx.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
    }

    if (id) {
      const owned = await tx.address.findFirst({ where: { id, userId: user.id }, select: { id: true } });
      if (!owned) throw new Error('not found');
      await tx.address.update({ where: { id }, data: payload });
    } else {
      await tx.address.create({ data: { ...payload, userId: user.id } });
    }
  });

  revalidatePath('/account/addresses');
  return { ok: true };
}

export async function deleteAddress(id: string): Promise<Result> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: 'Нужно войти' };

  await prisma.address.deleteMany({ where: { id, userId: user.id } });
  revalidatePath('/account/addresses');
  return { ok: true };
}

// ---------------------------------------------------------------- looks

const lookSchema = z.object({
  name: z.string().trim().min(1).max(60),
  items: z
    .array(z.object({ productId: z.string().min(1), slot: z.string().min(1), colorKey: z.string() }))
    .min(1)
    .max(8),
});

/** Saves whatever is currently on the mannequin into the customer's wardrobe. */
export async function saveLook(input: z.infer<typeof lookSchema>): Promise<Result & { id?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: 'unauthenticated' };

  const parsed = lookSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: 'Образ пуст' };

  const products = await prisma.product.findMany({
    where: { id: { in: parsed.data.items.map((i) => i.productId) } },
    select: { id: true, mannequinSlot: true },
  });
  const slotById = new Map(products.map((p) => [p.id, p.mannequinSlot]));

  const rows = parsed.data.items
    .filter((item) => slotById.has(item.productId))
    .map((item) => ({
      productId: item.productId,
      slot: slotById.get(item.productId)!,
      colorKey: item.colorKey || null,
    }));

  if (rows.length === 0) return { ok: false, message: 'Товары недоступны' };

  const look = await prisma.look.create({
    data: { userId: user.id, name: parsed.data.name, items: { create: rows } },
    select: { id: true },
  });

  revalidatePath('/account/looks');
  return { ok: true, id: look.id };
}

export async function deleteLook(id: string): Promise<Result> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: 'Нужно войти' };

  await prisma.look.deleteMany({ where: { id, userId: user.id } });
  revalidatePath('/account/looks');
  return { ok: true };
}

// ---------------------------------------------------------------- reviews

const reviewSchema = z.object({
  orderId: z.string().min(1),
  productId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  text: z.string().trim().min(10, 'Напишите хотя бы пару предложений').max(1000),
});

/**
 * A review may only come from someone who bought the item and whose order is
 * finished. The check is done here against the order, not trusted from the
 * form, so the rule holds no matter what is posted.
 */
export async function submitReview(input: z.infer<typeof reviewSchema>): Promise<Result> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: 'Нужно войти' };

  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'Проверьте отзыв' };
  }

  const order = await prisma.order.findFirst({
    where: {
      id: parsed.data.orderId,
      userId: user.id,
      status: OrderStatus.COMPLETED,
      items: { some: { productId: parsed.data.productId } },
    },
    select: { id: true },
  });
  if (!order) {
    return { ok: false, message: 'Отзыв можно оставить только на купленный товар из выполненного заказа' };
  }

  const existing = await prisma.review.findUnique({
    where: {
      productId_userId_orderId: {
        productId: parsed.data.productId,
        userId: user.id,
        orderId: order.id,
      },
    },
    select: { id: true },
  });
  if (existing) return { ok: false, message: 'Вы уже оставили отзыв на этот товар' };

  await prisma.review.create({
    data: {
      productId: parsed.data.productId,
      userId: user.id,
      orderId: order.id,
      rating: parsed.data.rating,
      text: parsed.data.text,
      status: ReviewStatus.PENDING,
    },
  });

  revalidatePath('/account/orders');
  revalidatePath('/admin/reviews');
  return { ok: true };
}
