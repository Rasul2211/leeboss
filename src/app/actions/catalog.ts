'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { MannequinSlot, Permission } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, hasPermission } from '@/lib/auth';

export type CatalogResult = { ok: true; slug: string } | { ok: false; message: string };

/** Fresh rows start here; the shop corrects the real count on the stock page. */
const DEFAULT_STOCK = 3;

const productSchema = z.object({
  name: z.string().trim().min(2, 'Слишком короткое название').max(120),
  categoryId: z.string().min(1, 'Выберите раздел'),
  price: z.coerce.number().int().min(1, 'Укажите цену').max(100000),
  colorName: z.string().trim().min(2, 'Укажите цвет').max(40),
  colorHex: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Цвет задан неверно'),
  sizes: z.array(z.string().trim().min(1)).min(1, 'Выберите хотя бы один размер'),
  image: z.string().url('Загрузите фотографию'),
  brand: z.string().trim().max(60).optional(),
});

const outfitSchema = z.object({
  name: z.string().trim().min(2, 'Слишком короткое название').max(120),
  image: z.string().url('Загрузите фотографию'),
  pieces: z
    .array(
      z.object({
        title: z.string().trim().min(2, 'Назовите вещь').max(120),
        price: z.coerce.number().int().min(1, 'Укажите цену').max(100000),
      }),
    )
    .min(2, 'В образе должно быть хотя бы две вещи')
    .max(6),
});

/**
 * Latin slug from a Russian name, because the address bar and the file names
 * around it are latin everywhere else in the catalogue.
 */
const TRANSLIT: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i',
  й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't',
  у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '',
  э: 'e', ю: 'yu', я: 'ya',
};

function slugify(name: string): string {
  const base = [...name.toLowerCase()]
    .map((ch) => TRANSLIT[ch] ?? ch)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'tovar';
}

/** Adds -2, -3 … until the address is free, so two red tees can share a name. */
async function freeSlug(base: string): Promise<string> {
  for (let n = 1; n < 100; n += 1) {
    const slug = n === 1 ? base : `${base}-${n}`;
    const taken = await prisma.product.findUnique({ where: { slug }, select: { id: true } });
    if (!taken) return slug;
  }
  return `${base}-${Date.now().toString(36)}`;
}

function skuFor(slug: string): string {
  let hash = 0;
  for (const ch of slug) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return `LB-${hash.toString(36).toUpperCase().padStart(7, '0').slice(0, 7)}`;
}

function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Проверьте поля';
}

export async function createProduct(input: unknown): Promise<CatalogResult> {
  const user = await getCurrentUser();
  if (!hasPermission(user, Permission.PRODUCTS_MANAGE)) {
    return { ok: false, message: 'Недостаточно прав' };
  }

  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: firstError(parsed.error) };
  const data = parsed.data;

  const category = await prisma.category.findUnique({
    where: { id: data.categoryId },
    select: { id: true, mannequinSlot: true },
  });
  if (!category) return { ok: false, message: 'Раздел не найден' };

  const slug = await freeSlug(slugify(data.name));

  const product = await prisma.product.create({
    data: {
      sku: skuFor(slug),
      slug,
      name: data.name,
      brand: data.brand?.trim() ? data.brand.trim() : null,
      price: data.price,
      categoryId: category.id,
      mannequinSlot: category.mannequinSlot,
      images: { create: [{ url: data.image, alt: data.name, sortOrder: 0 }] },
      colors: {
        create: [{ key: slugify(data.colorName), name: data.colorName, hex: data.colorHex, sortOrder: 0 }],
      },
    },
    select: { id: true, slug: true, colors: { select: { id: true } } },
  });

  const colour = product.colors[0];
  if (colour) {
    await prisma.productVariant.createMany({
      data: [...new Set(data.sizes)].map((size) => ({
        productId: product.id,
        colorId: colour.id,
        size,
        stock: DEFAULT_STOCK,
      })),
      skipDuplicates: true,
    });
  }

  revalidatePath('/catalog', 'layout');
  revalidatePath('/');
  return { ok: true, slug: product.slug };
}

export async function createOutfit(input: unknown): Promise<CatalogResult> {
  const user = await getCurrentUser();
  if (!hasPermission(user, Permission.PRODUCTS_MANAGE)) {
    return { ok: false, message: 'Недостаточно прав' };
  }

  const parsed = outfitSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: firstError(parsed.error) };
  const data = parsed.data;

  // outfits live in their own section, created on first use
  const category = await prisma.category.upsert({
    where: { slug: 'obrazy' },
    update: { isActive: true },
    create: {
      slug: 'obrazy',
      name: 'Образы',
      sizeType: 'LETTER',
      mannequinSlot: MannequinSlot.TOP,
      sortOrder: 0,
    },
    select: { id: true },
  });

  const slug = await freeSlug(`obraz-${slugify(data.name)}`);
  const total = data.pieces.reduce((sum, piece) => sum + piece.price, 0);

  const outfit = await prisma.product.create({
    data: {
      sku: skuFor(slug),
      slug,
      name: data.name,
      price: total,
      categoryId: category.id,
      mannequinSlot: MannequinSlot.TOP,
      isOutfit: true,
      images: { create: [{ url: data.image, alt: data.name, sortOrder: 0 }] },
      colors: { create: [{ key: 'kak-na-foto', name: 'Как на фото', hex: '#8d7f6c', sortOrder: 0 }] },
      pieces: {
        create: data.pieces.map((piece, index) => ({
          title: piece.title,
          price: piece.price,
          sortOrder: index,
        })),
      },
    },
    select: { id: true, slug: true, colors: { select: { id: true } } },
  });

  // one variant: the three sizes a buyer picks are recorded on the order line
  const colour = outfit.colors[0];
  if (colour) {
    await prisma.productVariant.create({
      data: { productId: outfit.id, colorId: colour.id, size: 'ONE', stock: DEFAULT_STOCK },
    });
  }

  revalidatePath('/catalog', 'layout');
  revalidatePath('/');
  return { ok: true, slug: outfit.slug };
}

/** Replaces the photograph of a product that already exists. */
export async function setProductPhoto(productId: string, url: string): Promise<CatalogResult> {
  const user = await getCurrentUser();
  if (!hasPermission(user, Permission.PRODUCTS_MANAGE)) {
    return { ok: false, message: 'Недостаточно прав' };
  }

  if (!/^https?:\/\//.test(url)) return { ok: false, message: 'Некорректный адрес фотографии' };

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, name: true, slug: true },
  });
  if (!product) return { ok: false, message: 'Товар не найден' };

  await prisma.$transaction([
    prisma.productImage.deleteMany({ where: { productId: product.id } }),
    prisma.productImage.create({
      data: { productId: product.id, url, alt: product.name, sortOrder: 0 },
    }),
  ]);

  revalidatePath(`/product/${product.slug}`);
  revalidatePath('/catalog', 'layout');
  revalidatePath('/');
  return { ok: true, slug: product.slug };
}
