'use server';

import { revalidatePath } from 'next/cache';
import { OrderStatus, Permission, ReviewStatus, Role } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, hasPermission } from '@/lib/auth';
import { nextStatuses } from '@/lib/orders';
import { ADMIN_ONLY } from '@/lib/staff-nav';

export type ActionResult = { ok: true } | { ok: false; message: string };

const DENIED: ActionResult = { ok: false, message: 'Недостаточно прав' };

/** Every staff action re-checks the right on the server before touching data. */
async function requireRight(permission: Permission) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, permission)) return null;
  return user;
}

// ---------------------------------------------------------------- orders

const statusSchema = z.object({
  orderId: z.string().min(1),
  status: z.nativeEnum(OrderStatus),
  note: z.string().trim().max(300).optional(),
});

export async function setOrderStatus(input: {
  orderId: string;
  status: OrderStatus;
  note?: string;
}): Promise<ActionResult> {
  const user = await requireRight(Permission.ORDERS_MANAGE);
  if (!user) return DENIED;

  const parsed = statusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: 'Некорректные данные' };

  const order = await prisma.order.findUnique({
    where: { id: parsed.data.orderId },
    select: {
      id: true,
      status: true,
      deliveryMethod: true,
      items: { select: { variantId: true, quantity: true } },
    },
  });
  if (!order) return { ok: false, message: 'Заказ не найден' };

  const allowed = nextStatuses(order.status, order.deliveryMethod);
  if (!allowed.includes(parsed.data.status)) {
    return { ok: false, message: 'Такой переход статуса недоступен' };
  }

  await prisma.$transaction(async (tx) => {
    // cancelling puts the reserved goods back on the shelf
    if (parsed.data.status === OrderStatus.CANCELLED) {
      for (const item of order.items) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { increment: item.quantity } },
        });
      }
    }

    await tx.order.update({
      where: { id: order.id },
      data: { status: parsed.data.status },
    });

    await tx.orderStatusEvent.create({
      data: {
        orderId: order.id,
        status: parsed.data.status,
        byUserId: user.id,
        note: parsed.data.note || null,
      },
    });
  });

  revalidatePath('/admin/orders');
  revalidatePath('/employee/orders');
  revalidatePath('/account/orders');
  return { ok: true };
}

// ---------------------------------------------------------------- products

const productSchema = z.object({
  productId: z.string().min(1),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000).optional(),
  material: z.string().trim().max(200).optional(),
  care: z.string().trim().max(200).optional(),
  sizeNote: z.string().trim().max(200).optional(),
  isActive: z.boolean(),
});

export async function updateProduct(input: z.infer<typeof productSchema>): Promise<ActionResult> {
  const user = await requireRight(Permission.PRODUCTS_MANAGE);
  if (!user) return DENIED;

  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: 'Проверьте поля' };

  const { productId, ...data } = parsed.data;
  await prisma.product.update({
    where: { id: productId },
    data: {
      name: data.name,
      description: data.description || null,
      material: data.material || null,
      care: data.care || null,
      sizeNote: data.sizeNote || null,
      isActive: data.isActive,
    },
  });

  revalidatePath('/admin/products');
  revalidatePath('/employee/products');
  revalidatePath('/catalog');
  return { ok: true };
}

const pricingSchema = z
  .object({
    productId: z.string().min(1),
    price: z.number().int().min(1).max(1_000_000),
    salePrice: z.number().int().min(1).max(1_000_000).nullable(),
  })
  .refine((v) => v.salePrice == null || v.salePrice < v.price, {
    path: ['salePrice'],
    message: 'Цена со скидкой должна быть ниже обычной',
  });

/** Money is a separate right from content: not everyone who edits a card may reprice it. */
export async function updatePricing(input: {
  productId: string;
  price: number;
  salePrice: number | null;
}): Promise<ActionResult> {
  const user = await requireRight(Permission.PRICING_MANAGE);
  if (!user) return DENIED;

  const parsed = pricingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'Некорректная цена' };
  }

  await prisma.product.update({
    where: { id: parsed.data.productId },
    data: { price: parsed.data.price, salePrice: parsed.data.salePrice },
  });

  revalidatePath('/admin/products');
  revalidatePath('/catalog');
  revalidatePath('/');
  return { ok: true };
}

export async function updateStock(variantId: string, stock: number): Promise<ActionResult> {
  const user = await requireRight(Permission.STOCK_MANAGE);
  if (!user) return DENIED;

  const parsed = z.object({ variantId: z.string().min(1), stock: z.number().int().min(0).max(9999) })
    .safeParse({ variantId, stock });
  if (!parsed.success) return { ok: false, message: 'Некорректный остаток' };

  await prisma.productVariant.update({
    where: { id: parsed.data.variantId },
    data: { stock: parsed.data.stock },
  });

  revalidatePath('/admin/stock');
  revalidatePath('/employee/stock');
  return { ok: true };
}

// ---------------------------------------------------------------- reviews

export async function moderateReview(reviewId: string, status: ReviewStatus): Promise<ActionResult> {
  const user = await requireRight(Permission.PRODUCTS_MANAGE);
  if (!user) return DENIED;

  await prisma.review.update({ where: { id: reviewId }, data: { status } });
  revalidatePath('/admin/reviews');
  revalidatePath('/employee/reviews');
  return { ok: true };
}

// ---------------------------------------------------------------- employees

const permissionsSchema = z.object({
  userId: z.string().min(1),
  permissions: z.array(z.nativeEnum(Permission)),
});

/**
 * Replaces an employee's rights wholesale.
 *
 * EMPLOYEES_MANAGE and SETTINGS_MANAGE are filtered out no matter what was
 * posted: those belong to the administrator alone, and an employee who could
 * grant them to themselves would make every other check pointless.
 */
export async function setEmployeePermissions(input: {
  userId: string;
  permissions: Permission[];
}): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user || user.role !== Role.ADMIN) return DENIED;

  const parsed = permissionsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: 'Некорректные права' };

  const target = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
    select: { id: true, role: true },
  });
  if (!target || target.role === Role.ADMIN) {
    return { ok: false, message: 'Нельзя менять права администратора' };
  }

  const granted = parsed.data.permissions.filter((p) => !ADMIN_ONLY.includes(p));

  await prisma.$transaction([
    prisma.employeePermission.deleteMany({ where: { userId: target.id } }),
    prisma.employeePermission.createMany({
      data: granted.map((permission) => ({ userId: target.id, permission })),
    }),
  ]);

  revalidatePath('/admin/employees');
  return { ok: true };
}

export async function setUserRole(userId: string, role: Role): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user || user.role !== Role.ADMIN) return DENIED;
  if (user.id === userId) return { ok: false, message: 'Нельзя менять собственную роль' };
  if (role === Role.ADMIN) return { ok: false, message: 'Второго администратора назначает разработчик' };

  await prisma.user.update({ where: { id: userId }, data: { role } });
  if (role === Role.CUSTOMER) {
    await prisma.employeePermission.deleteMany({ where: { userId } });
  }

  revalidatePath('/admin/employees');
  return { ok: true };
}

// ---------------------------------------------------------------- categories

const categorySchema = z.object({
  categoryId: z.string().min(1),
  name: z.string().trim().min(2).max(60),
  isActive: z.boolean(),
});

export async function updateCategory(input: z.infer<typeof categorySchema>): Promise<ActionResult> {
  const user = await requireRight(Permission.CATEGORIES_MANAGE);
  if (!user) return DENIED;

  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: 'Проверьте название' };

  await prisma.category.update({
    where: { id: parsed.data.categoryId },
    data: { name: parsed.data.name, isActive: parsed.data.isActive },
  });

  revalidatePath('/admin/categories');
  revalidatePath('/employee/categories');
  revalidatePath('/', 'layout');
  return { ok: true };
}

// ---------------------------------------------------------------- looks

export async function setLookPublic(lookId: string, isPublic: boolean): Promise<ActionResult> {
  const user = await requireRight(Permission.LOOKS_MANAGE);
  if (!user) return DENIED;

  await prisma.look.update({ where: { id: lookId }, data: { isPublic } });
  revalidatePath('/admin/looks');
  revalidatePath('/employee/looks');
  revalidatePath('/');
  revalidatePath('/looks');
  return { ok: true };
}

// ---------------------------------------------------------------- delivery

const zoneSchema = z.object({
  zoneId: z.string().min(1),
  cost: z.number().int().min(0).max(10_000),
  freeThreshold: z.number().int().min(0).max(1_000_000).nullable(),
  daysMin: z.number().int().min(0).max(60),
  daysMax: z.number().int().min(0).max(60),
  isActive: z.boolean(),
});

export async function updateDeliveryZone(
  input: z.infer<typeof zoneSchema>,
): Promise<ActionResult> {
  const user = await requireRight(Permission.SETTINGS_MANAGE);
  if (!user) return DENIED;

  const parsed = zoneSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: 'Проверьте значения' };
  if (parsed.data.daysMax < parsed.data.daysMin) {
    return { ok: false, message: 'Максимальный срок меньше минимального' };
  }

  const { zoneId, ...data } = parsed.data;
  await prisma.deliveryZone.update({ where: { id: zoneId }, data });

  revalidatePath('/admin/delivery');
  revalidatePath('/checkout');
  revalidatePath('/delivery');
  return { ok: true };
}
